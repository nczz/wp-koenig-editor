import { apiFetch } from './api';

const config = window.wpKoenigConfig;

/**
 * Card configuration for KoenigComposer.
 * Adapts Ghost's card system to use WordPress APIs.
 *
 * Koenig calls fetchEmbed(url, options) for both embed and bookmark cards:
 * - Embed: fetchEmbed(url, {}) → expects { type, url, html, ... }
 * - Bookmark: fetchEmbed(url, { type: 'bookmark' }) → expects { url, metadata: { title, description, ... } }
 */
export const cardConfig = {
    fetchEmbed: async (url, options = {}) => {
        if (options.type === 'bookmark') {
            // Bookmark card: fetch Open Graph / meta tags.
            const meta = await apiFetch(`wp-koenig/v1/fetch-url-metadata?url=${encodeURIComponent(url)}`);
            return {
                url: meta.url,
                metadata: {
                    title: meta.title || '',
                    description: meta.description || '',
                    author: meta.author || '',
                    publisher: meta.publisher || '',
                    thumbnail: meta.thumbnail || '',
                    icon: meta.icon || '',
                },
            };
        }

        // Embed card: fetch oEmbed data.
        const data = await apiFetch(`wp-koenig/v1/oembed?url=${encodeURIComponent(url)}`);
        return data;
    },

    // Internal link search for link toolbar.
    // Koenig expects grouped format: [{ label: "Group", items: [{ label, value }] }]
    // Called with no arguments on mount for default suggestions.
    searchLinks: async (term) => {
        const query = term ? `search=${encodeURIComponent(term)}&` : '';
        const results = await apiFetch(`wp/v2/search?${query}type=post&per_page=5`);
        if (!results || !results.length) {
            return [];
        }
        return [{
            label: 'Posts',
            items: results.map((item) => ({
                label: item.title,
                value: item.url,
            })),
        }];
    },

    // Site URL for relative link resolution.
    siteUrl: config.siteUrl,

    // Disable Ghost-specific membership/monetization features.
    membersEnabled: false,
    stripeEnabled: false,
};
