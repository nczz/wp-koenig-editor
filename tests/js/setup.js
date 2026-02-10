import '@testing-library/jest-dom/vitest';

// Mock window.wpKoenigConfig used by api.js, card-config.js, etc.
window.wpKoenigConfig = {
    restUrl: 'https://example.com/wp-json/',
    restNonce: 'test-nonce-123',
    uploadUrl: 'https://example.com/wp-json/wp-koenig/v1/upload',
    oembedUrl: 'https://example.com/wp-json/wp-koenig/v1/oembed',
    bookmarkUrl: 'https://example.com/wp-json/wp-koenig/v1/fetch-url-metadata',
    siteUrl: 'https://example.com',
    adminUrl: 'https://example.com/wp-admin/',
    editPostListUrl: 'https://example.com/wp-admin/edit.php',
    darkMode: false,
    showWordCount: true,
    postData: JSON.stringify({
        id: 42,
        title: 'Test Post',
        content: '<p>Hello</p>',
        lexical_state: '',
        status: 'draft',
        slug: 'test-post',
        excerpt: '',
        date: '2024-01-15T10:30:00',
        modified: '2024-01-15T10:30:00',
        categories: [1],
        tags: [],
        featured_media: 0,
        rest_base: 'posts',
        post_type: 'post',
        preview_link: 'https://example.com/?p=42&preview=true',
    }),
};

// Mock global.fetch — individual tests can override via vi.fn()
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
);
