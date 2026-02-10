const config = window.wpKoenigConfig;

/**
 * Fetch from the WP REST API with authentication.
 *
 * @param {string} path - REST API path relative to rest URL (e.g., 'wp/v2/posts/123')
 * @param {object} options - fetch options
 * @returns {Promise<any>}
 */
export async function apiFetch(path, options = {}) {
    const url = path.startsWith('http')
        ? path
        : `${config.restUrl}${path}`;

    const headers = {
        'X-WP-Nonce': config.restNonce,
        ...options.headers,
    };

    // Add Content-Type for JSON requests.
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Upload a file to the Koenig upload endpoint.
 *
 * @param {File} file
 * @returns {Promise<{id: number, url: string, fileName: string, width: number, height: number}>}
 */
export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(config.uploadUrl, {
        method: 'POST',
        headers: {
            'X-WP-Nonce': config.restNonce,
        },
        credentials: 'same-origin',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Upload failed');
    }

    return response.json();
}
