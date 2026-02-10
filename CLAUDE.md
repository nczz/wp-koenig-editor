# WP Koenig Editor - Development Guide

## Project Overview

WordPress plugin that replaces Gutenberg with Ghost's Koenig editor (`@tryghost/koenig-lexical`).
Dual-field storage: `post_content` (rendered HTML) + `post_content_filtered` (Lexical JSON).

## Tech Stack

- **PHP 8.3** / **WordPress 6.9** / **Node 24** / **Vite 5**
- **React 18.2** bundled as IIFE (not using WP's React)
- **@tryghost/koenig-lexical ^1.7.10** (Ghost's open-source Lexical editor)

## Critical Rules

### 1. Never Ship Without Browser Verification

**Every code change MUST be verified in a real browser before committing.**

- Use Playwright tools (`browser_navigate`, `browser_snapshot`, `browser_console_messages`) to:
  1. Navigate to the WordPress editor page
  2. Check browser console for JS errors (level: "error")
  3. Take a snapshot to confirm the editor renders
- If you don't have login credentials, ASK the user before committing
- `npm run build` succeeding is NOT sufficient — runtime errors like wrong API formats only show in browser

### 2. Koenig API Contracts

Koenig's internal APIs are NOT well-documented. When integrating, always verify by reading the **minified bundle** to understand what Koenig actually expects. Key contracts:

- **`searchLinks(term)`**: Returns grouped format `[{ label: string, items: [{ label, value }] }]`, NOT flat arrays. Called with no arguments on mount for default suggestions.
- **`fetchEmbed(url, options)`**: `options.type === 'bookmark'` for bookmark cards. Returns `{ url, metadata: { title, description, ... } }` for bookmarks, `{ type, url, html, ... }` for embeds.
- **`fileUploader`**: Must be ref-stable object with `{ useFileUpload: hookFn }`. The hook returns `{ upload, isLoading, errors, progress }`.
- **`KoenigEditor onChange`**: Receives `editorState.toJSON()` as a plain **object**, not a string.
- **`HtmlOutputPlugin`**: `html` prop triggers HTML import on first render. Pass empty string when Lexical state exists to prevent overwriting.

When in doubt, use this technique to inspect the minified source:
```bash
node -e "
const fs = require('fs');
const line = fs.readFileSync('assets/js/koenig-editor.js','utf8').split('\n')[LINE_NUM - 1];
console.log(line.substring(COL_START, COL_END));
"
```

### 3. WordPress Integration Patterns

- **`replace_editor` is a filter** (returns true/false), NOT an action
- **`_wp_post_revision_fields`** stores results in a static variable — always add AND remove keys per-call
- **`wp_add_inline_script`** for scripts that depend on footer-loaded JS (e.g., heartbeat) — inline `<script>` in templates runs too early
- **REST API uses POST** (not PUT) for compatibility with restrictive hosting
- **`rest_base` fallback**: Use `$post_type` without appending 's' — WP core doesn't pluralize
- **`auto-draft` status**: Normalize to `'draft'` in JS — auto-drafts are auto-deleted by WP cron after 7 days

### 4. React Patterns in This Project

- **Ref pattern for stable callbacks**: `savePost` uses `postDataRef.current` instead of closing over `postData` state — keeps the useCallback dependency array empty
- **Save queuing**: `pendingOverridesRef` stores overrides when save is in-flight — processed in `finally` block
- **Dirty tracking**: Counter-based (`dirtyCounterRef` vs `savedCounterRef`), not JSON comparison
- **All unhandled promise paths must have `.catch(() => {})`** — savePost re-throws errors after setting UI status

## Architecture

```
wp-koenig-editor/
├── wp-koenig-editor.php        # Entry: constants, activation, wp_loaded init
├── src/                        # PHP (WPKoenig namespace, PSR-4 autoload)
│   ├── class-plugin.php        # Singleton: instantiates all modules
│   ├── class-editor.php        # replace_editor hook + post lock
│   ├── class-post-storage.php  # register_rest_field for lexical_state + revisions
│   ├── class-rest-api.php      # /oembed + /fetch-url-metadata endpoints
│   ├── class-media-bridge.php  # /upload endpoint
│   ├── class-assets.php        # Enqueue scripts, heartbeat, dequeue Gutenberg
│   ├── class-settings.php      # Settings API page
│   └── views/                  # PHP templates (editor-page.php, settings-page.php)
├── js/editor/                  # React source
│   ├── App.jsx                 # Root: title + editor + sidebar + status bar
│   ├── components/             # UI components
│   ├── hooks/                  # usePostData, useAutoSave, useFileUpload, useMediaLibrary
│   └── utils/                  # api.js (REST client), card-config.js (Koenig config)
├── assets/js/                  # Build output (gitignored): koenig-editor.js (IIFE)
└── vite.config.js              # IIFE format, koenig-lexical-styles alias
```

## Build

```bash
npm run build    # Production build → assets/js/koenig-editor.js
npm run dev      # Watch mode (vite build --watch)
```

- Output is a single **IIFE** bundle (NOT ES module) — WordPress loads via `<script>` without `type="module"`
- CSS from Koenig is inlined into JS via `document.createElement("style")` at runtime
- The `assets/js/` directory is gitignored; build is required after cloning

## Testing Environment

Test credentials are in `.env` (gitignored). Standard verification flow:

```bash
# 1. Read credentials
cat .env
# 2. Build
npm run build
# 3. Browser verification (see workflow below)
```

### Browser Verification Checklist

After every code change, run the automated test script:

```bash
NODE_PATH=/root/.nvm/versions/node/v24.12.0/lib/node_modules node tests/browser-test.cjs
```

The script reads credentials from `.env` and tests:
1. Login + editor page loads without JS errors
2. Title input, editor body text input
3. Markdown shortcuts (## heading renders as H2)
4. Save Draft via REST API (expects HTTP 200)
5. `/` slash command card menu appears
6. Settings sidebar open/close (including Escape key)
7. Categories/Tags taxonomy loading
8. Zero console errors, zero network failures

**All tests must show [PASS] or [OK] before committing.**

For manual deep testing on specific features, use Playwright directly:
```bash
NODE_PATH=/root/.nvm/versions/node/v24.12.0/lib/node_modules node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  // ... interactive testing
})();
"
```

## Development Workflow

1. Make code changes
2. Run `npm run build` — verify it succeeds
3. **Browser verify** — login to test WordPress, check console errors and visual rendering
4. Only then commit and push

## Common Pitfalls (Learned from 5+ audit rounds)

| Pitfall | What Happened | Prevention |
|---------|---------------|------------|
| Koenig API format mismatch | `searchLinks` returned flat array, Koenig expects grouped `{items}` | Read minified source to verify expected format |
| ES module in non-module context | Vite defaulted to ES format, WP `<script>` can't load it | Always use `format: 'iife'` in vite config |
| Inline script timing | Heartbeat binding ran before `wp.heartbeat` loaded | Use `wp_add_inline_script` attached to the dependency handle |
| Static variable pollution | WP `_wp_post_revision_fields` leaks additions to all posts | Always unset the key for non-applicable posts |
| Stale closures in React | `savePost` recreated on every keystroke, wasting memory | Use ref pattern, empty dependency array |
| Auto-draft not promoted | `'auto-draft' \|\| 'draft'` stays as auto-draft (truthy) | Explicitly check for `'auto-draft'` |
| Date format mismatch | PHP sends `+08:00` offset, REST API returns without it | Update `initialDateRef` after each save |
| Silent save swallowing | Publish during auto-save was silently dropped | Queue overrides via `pendingOverridesRef` |

## Git Conventions

- Commit messages: imperative verb, describe the "why", list specific changes
- Always end with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Remote: `git@github.com:nczz/wp-koenig-editor.git` (branch: `main`)

## Language

The project owner communicates in **Traditional Chinese (繁體中文)**. Respond in the same language unless code/technical terms are involved.
