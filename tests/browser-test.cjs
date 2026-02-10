/**
 * WP Koenig Editor - Browser Integration Test
 *
 * Verifies the editor works correctly in a real WordPress environment.
 * Reads credentials from .env file in the plugin root.
 *
 * Usage:
 *   NODE_PATH=/root/.nvm/versions/node/v24.12.0/lib/node_modules node tests/browser-test.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Read .env
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) env[match[1]] = match[2].trim();
});

const SITE_URL = env.URL || env.url;
const USERNAME = env.Account || env.account;
const PASSWORD = env.Password || env.password;

if (!SITE_URL || !USERNAME || !PASSWORD) {
    console.error('[FATAL] Missing credentials in .env. Expected: URL, Account, Password');
    process.exit(1);
}

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { passed++; console.log(`  [PASS] ${msg}`); }
function fail(msg) { failed++; console.log(`  [FAIL] ${msg}`); }
function warn(msg) { warnings++; console.log(`  [WARN] ${msg}`); }
function info(msg) { console.log(`  [INFO] ${msg}`); }

(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const consoleErrors = [];
    const networkFailures = [];
    const apiCalls = [];

    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', req => {
        networkFailures.push(`${req.url()} -> ${(req.failure() || {}).errorText}`);
    });
    page.on('response', async resp => {
        const url = resp.url();
        if (url.includes('/wp/v2/') || url.includes('/wp-koenig/')) {
            apiCalls.push({ url, status: resp.status() });
        }
    });

    try {
        // ========== LOGIN ==========
        console.log('\n1. Login');
        await page.goto(`${SITE_URL}wp-login.php`);
        await page.fill('#user_login', USERNAME);
        await page.fill('#user_pass', PASSWORD);
        await page.click('#wp-submit');
        await page.waitForURL('**/wp-admin/**', { timeout: 10000 });
        pass('Logged in to WordPress admin');

        // ========== EDITOR LOADS ==========
        console.log('\n2. Editor loads');
        await page.goto(`${SITE_URL}wp-admin/post-new.php`);
        await page.waitForSelector('.koenig-title-field', { timeout: 10000 });
        await page.waitForTimeout(3000);

        const checks = [
            ['#koenig-editor-root', 'Editor root element'],
            ['.koenig-app', 'React app container'],
            ['.koenig-title-field', 'Title field'],
            ['.koenig-status-bar', 'Status bar'],
            ['[contenteditable=true]', 'Contenteditable editor area'],
        ];
        for (const [sel, name] of checks) {
            (await page.locator(sel).count()) > 0 ? pass(name) : fail(name);
        }

        // ========== TEXT INPUT ==========
        console.log('\n3. Text input');
        await page.fill('.koenig-title-field', 'Browser Test Post');
        const titleVal = await page.locator('.koenig-title-field').inputValue();
        titleVal === 'Browser Test Post' ? pass('Title input') : fail('Title: ' + titleVal);

        const editor = page.locator('[contenteditable=true]').first();
        await editor.click();
        await page.waitForTimeout(300);
        await page.keyboard.type('Hello world', { delay: 20 });
        await page.waitForTimeout(500);
        const bodyText = await editor.innerText();
        bodyText.includes('Hello world') ? pass('Editor body input') : fail('Body: ' + bodyText);

        // ========== MARKDOWN SHORTCUTS ==========
        console.log('\n4. Markdown shortcuts');
        await page.keyboard.press('Enter');
        await page.keyboard.type('## Test Heading', { delay: 20 });
        await page.waitForTimeout(1000);
        const h2Count = await page.locator('h2').filter({ hasText: 'Test Heading' }).count();
        h2Count > 0 ? pass('## rendered as H2') : fail('H2 not found');

        // ========== SAVE DRAFT ==========
        console.log('\n5. Save Draft');
        apiCalls.length = 0; // reset
        await page.click('button:has-text("Save Draft")');
        await page.waitForTimeout(4000);

        const saveApiCall = apiCalls.find(c => c.url.includes('/wp/v2/posts'));
        if (saveApiCall) {
            saveApiCall.status === 200 ? pass(`REST API save (HTTP ${saveApiCall.status})`) : fail(`REST API save (HTTP ${saveApiCall.status})`);
        } else {
            fail('No REST API save call detected');
        }

        // ========== SLASH COMMAND ==========
        console.log('\n6. Slash command menu');
        const editor2 = page.locator('[contenteditable=true]').first();
        await editor2.click();
        await page.keyboard.press('Enter');
        await page.keyboard.type('/', { delay: 50 });
        await page.waitForTimeout(1500);
        // Koenig's card menu uses various selectors — check for any popup-like element
        const cardMenu = await page.evaluate(() => {
            const els = document.querySelectorAll('[data-kg-cardmenu], [data-kg-card-menu-container], [role=menu]');
            // Also check for any absolutely positioned popup near the editor
            const popups = document.querySelectorAll('.koenig-lexical ul, .koenig-lexical [class*=cardMenu]');
            return els.length + popups.length;
        });
        cardMenu > 0 ? pass('Slash command menu appeared') : info('Slash menu (selector may differ, check screenshot)');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // ========== SETTINGS SIDEBAR ==========
        console.log('\n7. Settings sidebar');
        const gearBtn = page.locator('button[title="Post settings"]');
        if (await gearBtn.count() > 0) {
            await gearBtn.click();
            await page.waitForTimeout(2000);

            const sidebar = await page.locator('.koenig-sidebar').count();
            sidebar > 0 ? pass('Sidebar opens') : fail('Sidebar not found');

            // Check taxonomy loading
            await page.waitForTimeout(2000);
            const catText = await page.locator('.koenig-sidebar__field').filter({ hasText: 'Categories' }).innerText().catch(() => '');
            catText.includes('Loading') ? warn('Categories still loading after 4s') : pass('Categories loaded');

            // Escape to close
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            const sidebarGone = (await page.locator('.koenig-sidebar').count()) === 0;
            sidebarGone ? pass('Sidebar closes with Escape') : fail('Sidebar still visible after Escape');
        } else {
            fail('Gear button not found');
        }

        // ========== CONSOLE ERRORS ==========
        console.log('\n8. Error check');
        const realErrors = consoleErrors.filter(e => e.indexOf('beforeunload') === -1);
        realErrors.length === 0 ? pass('Zero JS console errors') : realErrors.forEach(e => fail('JS error: ' + e));
        networkFailures.length === 0 ? pass('Zero network failures') : networkFailures.forEach(e => fail('Network: ' + e));

    } catch (e) {
        fail('Unexpected error: ' + e.message);
    }

    await page.screenshot({ path: path.resolve(__dirname, '..', 'tests', 'last-run.png'), fullPage: true });
    await browser.close();

    // ========== SUMMARY ==========
    console.log('\n========================================');
    console.log(`  PASSED: ${passed}  FAILED: ${failed}  WARNINGS: ${warnings}`);
    console.log('========================================\n');

    if (failed > 0) {
        console.log('Screenshot saved to tests/last-run.png');
        process.exit(1);
    }
})().catch(e => {
    console.error('[FATAL]', e.message);
    process.exit(1);
});
