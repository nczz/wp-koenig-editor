import { cardConfig } from '@/utils/card-config.js';

describe('cardConfig', () => {
    beforeEach(() => {
        fetch.mockReset();
    });

    describe('fetchEmbed', () => {
        it('calls fetch-url-metadata for bookmark type and returns { url, metadata }', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: 'https://blog.example.com/article',
                        title: 'Great Article',
                        description: 'A summary',
                        author: 'Alice',
                        publisher: 'ExampleBlog',
                        thumbnail: 'https://blog.example.com/thumb.jpg',
                        icon: 'https://blog.example.com/favicon.ico',
                    }),
            });

            const result = await cardConfig.fetchEmbed('https://blog.example.com/article', {
                type: 'bookmark',
            });

            const calledUrl = fetch.mock.calls[0][0];
            expect(calledUrl).toContain('wp-koenig/v1/fetch-url-metadata');
            expect(calledUrl).toContain(encodeURIComponent('https://blog.example.com/article'));
            expect(result).toEqual({
                url: 'https://blog.example.com/article',
                metadata: {
                    title: 'Great Article',
                    description: 'A summary',
                    author: 'Alice',
                    publisher: 'ExampleBlog',
                    thumbnail: 'https://blog.example.com/thumb.jpg',
                    icon: 'https://blog.example.com/favicon.ico',
                },
            });
        });

        it('calls oembed for embed type and returns raw data', async () => {
            const oembedData = {
                type: 'video',
                url: 'https://youtube.com/watch?v=123',
                html: '<iframe src="..."></iframe>',
            };
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(oembedData),
            });

            const result = await cardConfig.fetchEmbed('https://youtube.com/watch?v=123');

            const calledUrl = fetch.mock.calls[0][0];
            expect(calledUrl).toContain('wp-koenig/v1/oembed');
            expect(result).toEqual(oembedData);
        });
    });

    describe('searchLinks', () => {
        it('returns grouped format when results exist', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        { title: 'Post One', url: 'https://example.com/post-one' },
                        { title: 'Post Two', url: 'https://example.com/post-two' },
                    ]),
            });

            const result = await cardConfig.searchLinks('test');

            const calledUrl = fetch.mock.calls[0][0];
            expect(calledUrl).toContain('search=test');
            expect(result).toEqual([
                {
                    label: 'Posts',
                    items: [
                        { label: 'Post One', value: 'https://example.com/post-one' },
                        { label: 'Post Two', value: 'https://example.com/post-two' },
                    ],
                },
            ]);
        });

        it('does not include search= when called without term', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ title: 'Latest', url: 'https://example.com/latest' }]),
            });

            await cardConfig.searchLinks();

            const calledUrl = fetch.mock.calls[0][0];
            expect(calledUrl).not.toContain('search=undefined');
            expect(calledUrl).toContain('type=post');
        });

        it('returns empty array when no results', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const result = await cardConfig.searchLinks('nonexistent');

            expect(result).toEqual([]);
        });
    });

    describe('fetchEmbed — edge cases', () => {
        it('bookmark with missing metadata fields defaults to empty strings', async () => {
            // WordPress page may have no og tags at all. Koenig should
            // still render the bookmark card without crashing.
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ url: 'https://bare.example.com' }),
            });

            const result = await cardConfig.fetchEmbed('https://bare.example.com', {
                type: 'bookmark',
            });

            expect(result.metadata.title).toBe('');
            expect(result.metadata.description).toBe('');
            expect(result.metadata.thumbnail).toBe('');
            expect(result.metadata.icon).toBe('');
        });

        it('URL with special characters is properly encoded in query string', async () => {
            // URLs with & and = must be encoded or the API endpoint
            // will parse the query string incorrectly.
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ type: 'rich', url: '', html: '' }),
            });

            await cardConfig.fetchEmbed('https://example.com/page?a=1&b=2');

            const calledUrl = fetch.mock.calls[0][0];
            // The & in the URL should be encoded, not treated as query separator
            expect(calledUrl).toContain(encodeURIComponent('https://example.com/page?a=1&b=2'));
        });
    });

    describe('searchLinks — edge cases', () => {
        it('returns results Koenig can render even with API returning null response', async () => {
            // If the WP search API returns null (edge case), searchLinks
            // should not crash the link toolbar.
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(null),
            });

            const result = await cardConfig.searchLinks('test');

            expect(result).toEqual([]);
        });

        it('limits results to per_page=5 so link dropdown stays usable', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await cardConfig.searchLinks('test');

            const calledUrl = fetch.mock.calls[0][0];
            expect(calledUrl).toContain('per_page=5');
        });
    });

    describe('static config values', () => {
        it('siteUrl comes from wpKoenigConfig', () => {
            expect(cardConfig.siteUrl).toBe('https://example.com');
        });

        it('membersEnabled is false', () => {
            expect(cardConfig.membersEnabled).toBe(false);
        });

        it('stripeEnabled is false', () => {
            expect(cardConfig.stripeEnabled).toBe(false);
        });
    });
});
