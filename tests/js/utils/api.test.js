import { apiFetch, uploadFile } from '@/utils/api.js';

describe('apiFetch', () => {
    beforeEach(() => {
        fetch.mockReset();
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: 1, title: 'Test' }),
        });
    });

    it('prepends restUrl to relative paths', async () => {
        await apiFetch('wp/v2/posts/42');

        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/wp-json/wp/v2/posts/42',
            expect.any(Object)
        );
    });

    it('uses absolute URL as-is for http paths', async () => {
        await apiFetch('https://other.com/api/data');

        expect(fetch).toHaveBeenCalledWith(
            'https://other.com/api/data',
            expect.any(Object)
        );
    });

    it('includes X-WP-Nonce header', async () => {
        await apiFetch('wp/v2/posts');

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.headers['X-WP-Nonce']).toBe('test-nonce-123');
    });

    it('adds Content-Type application/json for string body', async () => {
        await apiFetch('wp/v2/posts/42', {
            method: 'POST',
            body: JSON.stringify({ title: 'Updated' }),
        });

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.headers['Content-Type']).toBe('application/json');
    });

    it('returns parsed JSON on success', async () => {
        const result = await apiFetch('wp/v2/posts/42');

        expect(result).toEqual({ id: 1, title: 'Test' });
    });

    it('throws Error with API message on HTTP error', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ message: 'Forbidden access' }),
        });

        await expect(apiFetch('wp/v2/posts/42')).rejects.toThrow('Forbidden access');
    });

    it('throws fallback message when error body is not JSON', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('parse error')),
        });

        await expect(apiFetch('wp/v2/posts/42')).rejects.toThrow('API error: 500');
    });

    // --- Behavioral tests: WordPress authentication & security ---

    it('always sends credentials same-origin for cookie auth', async () => {
        // WordPress REST API relies on cookie auth + nonce.
        // Without credentials: 'same-origin', logged-in user appears anonymous.
        await apiFetch('wp/v2/posts');

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.credentials).toBe('same-origin');
    });

    it('does NOT set Content-Type for non-string body (e.g. FormData)', async () => {
        // If Content-Type is set on FormData, the browser can't add the
        // multipart boundary, and the server rejects the upload.
        const formData = new FormData();
        formData.append('key', 'value');

        await apiFetch('wp/v2/media', { method: 'POST', body: formData });

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.headers['Content-Type']).toBeUndefined();
    });

    it('allows caller headers to override defaults', async () => {
        // Custom integration might need a different nonce or auth header.
        await apiFetch('wp/v2/posts', {
            headers: { 'X-WP-Nonce': 'custom-nonce', 'X-Custom': 'value' },
        });

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.headers['X-WP-Nonce']).toBe('custom-nonce');
        expect(callOptions.headers['X-Custom']).toBe('value');
    });
});

describe('uploadFile', () => {
    beforeEach(() => {
        fetch.mockReset();
        fetch.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    id: 10,
                    url: 'https://example.com/wp-content/uploads/photo.jpg',
                    fileName: 'photo.jpg',
                    width: 800,
                    height: 600,
                }),
        });
    });

    it('sends POST with FormData to upload URL', async () => {
        const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
        await uploadFile(file);

        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/wp-json/wp-koenig/v1/upload',
            expect.objectContaining({
                method: 'POST',
                headers: { 'X-WP-Nonce': 'test-nonce-123' },
                credentials: 'same-origin',
            })
        );
        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.body).toBeInstanceOf(FormData);
    });

    it('throws Error on upload failure', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 413,
            json: () => Promise.resolve({ message: 'File too large' }),
        });

        const file = new File(['pixels'], 'big.jpg', { type: 'image/jpeg' });
        await expect(uploadFile(file)).rejects.toThrow('File too large');
    });

    it('does NOT set Content-Type header so browser adds multipart boundary', async () => {
        // Setting Content-Type manually on FormData breaks the multipart
        // boundary, causing WordPress to reject the upload with "No file".
        const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
        await uploadFile(file);

        const callOptions = fetch.mock.calls[0][1];
        expect(callOptions.headers['Content-Type']).toBeUndefined();
    });

    it('attaches the file under the "file" key matching WP media_handle_upload', async () => {
        // WordPress's media_handle_upload('file', 0) expects $_FILES['file'].
        // If the FormData key is wrong, upload silently fails with "No file".
        const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
        await uploadFile(file);

        const formData = fetch.mock.calls[0][1].body;
        expect(formData.get('file')).toBeInstanceOf(File);
        expect(formData.get('file').name).toBe('photo.jpg');
    });

    it('returns fallback message "Upload failed" when error body is not JSON', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('not json')),
        });

        const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
        await expect(uploadFile(file)).rejects.toThrow('Upload failed');
    });
});
