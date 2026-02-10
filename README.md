# WP Koenig Editor

Replace WordPress Gutenberg with [Ghost](https://ghost.org/)'s Koenig editor — a Lexical-based, distraction-free writing experience with real-time Markdown rendering, floating toolbar, and card system.

## Features

- **Ghost-style editor** — powered by [`@tryghost/koenig-lexical`](https://github.com/TryGhost/Koenig)
- **Real-time Markdown** — type `**bold**`, `## heading`, `> quote` and see instant rendering
- **Card system** — press `/` to insert images, embeds, bookmarks, code blocks, and more
- **Floating toolbar** — select text to format without leaving the flow
- **WordPress native storage** — `post_content` stores rendered HTML (theme-compatible), `post_content_filtered` stores Lexical JSON (editor state)
- **Revision support** — Lexical state is included in post revisions
- **Media library integration** — drag & drop upload or use the WP media picker
- **oEmbed support** — paste a YouTube/Twitter/etc. URL to auto-embed
- **Per-post-type toggle** — enable Koenig only for the post types you want
- **Dark mode** — optional dark editor theme
- **Auto-save** — 60-second interval with unsaved changes warning

## Requirements

- WordPress 5.8+
- PHP 7.4+
- Node.js 18+ (for building)

## Installation

```bash
cd wp-content/plugins/wp-koenig-editor
npm install
npm run build
```

Then activate the plugin in **WordPress Admin > Plugins**.

## Configuration

Go to **Settings > Koenig Editor** to:

- Choose which post types use Koenig (default: Posts)
- Toggle dark mode
- Toggle word count display

## Development

```bash
# Watch mode (rebuild on file changes)
npm run dev

# Production build
npm run build
```

## Architecture

```
wp-koenig-editor/
├── wp-koenig-editor.php        # Plugin entry point
├── uninstall.php               # Cleanup on uninstall
├── package.json                # Node dependencies
├── vite.config.js              # Vite build config
├── src/                        # PHP classes (WPKoenig namespace)
│   ├── autoload.php            # PSR-4 autoloader
│   ├── class-plugin.php        # Singleton coordinator
│   ├── class-editor.php        # Gutenberg replacement (replace_editor hook)
│   ├── class-settings.php      # Settings API page
│   ├── class-post-storage.php  # Dual-field storage + revisions
│   ├── class-rest-api.php      # oEmbed proxy + URL metadata endpoints
│   ├── class-media-bridge.php  # File upload REST endpoint
│   ├── class-assets.php        # Script/style loading
│   └── views/                  # PHP templates
├── js/editor/                  # React source (JSX)
│   ├── index.jsx               # Entry point
│   ├── App.jsx                 # Root component
│   ├── components/             # UI components
│   ├── hooks/                  # React hooks
│   └── utils/                  # API client, card config
└── assets/js/                  # Built output (gitignored)
```

## Storage Strategy

| Field | Content | Purpose |
|-------|---------|---------|
| `post_content` | Rendered HTML | Theme display, RSS, search indexing |
| `post_content_filtered` | Lexical JSON | Editor state for re-editing |
| `_wp_koenig_editor` meta | `"1"` | Marks posts created with Koenig |

This dual-field approach is proven by [wp-githuber-md](https://github.com/terrylinooo/githuber-md) and ensures full theme compatibility.

## REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `wp-koenig/v1/upload` | POST | Upload files to WP media library |
| `wp-koenig/v1/oembed?url=` | GET | oEmbed proxy |
| `wp-koenig/v1/fetch-url-metadata?url=` | GET | Open Graph metadata for bookmark cards |

The upload endpoint requires `upload_files` capability; other endpoints require `edit_posts`.

## License

GPL-2.0-or-later
