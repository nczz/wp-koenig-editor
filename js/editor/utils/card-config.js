import { apiFetch } from './api';

const config = window.wpKoenigConfig;

/**
 * Card configuration for KoenigComposer.
 * Adapts Ghost's card system to use WordPress APIs.
 */
export const cardConfig = {
    // oEmbed proxy for embed cards.
    fetchEmbed: async (url) => {
        const data = await apiFetch(`wp-koenig/v1/oembed?url=${encodeURIComponent(url)}`);
        return data;
    },

    // Bookmark card metadata fetcher.
    fetchBookmarkMetadata: async (url) => {
        const data = await apiFetch(`wp-koenig/v1/fetch-url-metadata?url=${encodeURIComponent(url)}`);
        return data;
    },

    // Internal link search for link toolbar.
    searchLinks: async (term) => {
        const results = await apiFetch(`wp/v2/search?search=${encodeURIComponent(term)}&type=post&per_page=5`);
        return results.map((item) => ({
            title: item.title,
            url: item.url,
        }));
    },

    // Site URL for relative link resolution.
    siteUrl: config.siteUrl,

    // Disable Ghost-specific features.
    feature: {
        collections: false,
        collectionsCard: false,
        signup: false,
        signupCard: false,
        headerCard: false,
    },

    // Membership/monetization features are not applicable.
    membersEnabled: false,
    stripeEnabled: false,
};
