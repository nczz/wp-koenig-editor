import { renderHook, act } from '@testing-library/react';
import usePostData from '@/hooks/usePostData.js';

// Mock apiFetch at the module level
vi.mock('@/utils/api.js', () => ({
    apiFetch: vi.fn(),
}));

import { apiFetch } from '@/utils/api.js';

const defaultInitialData = {
    id: 42,
    title: 'Test Post',
    content: '<p>Hello</p>',
    lexical_state: '{"root":{}}',
    status: 'draft',
    slug: 'test-post',
    excerpt: '',
    date: '2024-01-15T10:30:00',
    categories: [1],
    tags: [],
    featured_media: 0,
    rest_base: 'posts',
};

describe('usePostData', () => {
    beforeEach(() => {
        apiFetch.mockReset();
        apiFetch.mockResolvedValue({
            id: 42,
            slug: 'test-post',
            status: 'draft',
            date: '2024-01-15T10:30:00',
            modified: '2024-01-15T10:31:00',
        });
    });

    describe('initialization', () => {
        it('normalizes auto-draft to draft', () => {
            const { result } = renderHook(() =>
                usePostData({ ...defaultInitialData, status: 'auto-draft' })
            );
            expect(result.current.postData.status).toBe('draft');
        });

        it('preserves existing status like publish', () => {
            const { result } = renderHook(() =>
                usePostData({ ...defaultInitialData, status: 'publish' })
            );
            expect(result.current.postData.status).toBe('publish');
        });

        it('provides defaults for empty values', () => {
            const { result } = renderHook(() =>
                usePostData({ id: 1 })
            );
            expect(result.current.postData.title).toBe('');
            expect(result.current.postData.categories).toEqual([]);
            expect(result.current.postData.tags).toEqual([]);
            expect(result.current.postData.featured_media).toBe(0);
        });
    });

    describe('setPostData', () => {
        it('updates state and marks dirty', () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            expect(result.current.isDirty).toBe(false);

            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Changed' }));
            });

            expect(result.current.postData.title).toBe('Changed');
            expect(result.current.isDirty).toBe(true);
        });
    });

    describe('savePost', () => {
        it('calls apiFetch with correct endpoint and body', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                await result.current.savePost();
            });

            expect(apiFetch).toHaveBeenCalledWith('wp/v2/posts/42', {
                method: 'POST',
                body: expect.any(String),
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.title).toBe('Test Post');
            expect(body.status).toBe('draft');
            expect(body.lexical_state).toBe('{"root":{}}');
        });

        it('does not send date when unchanged from initial', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                await result.current.savePost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.date).toBeUndefined();
        });

        it('sends date when user changed it', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            act(() => {
                result.current.setPostData((prev) => ({
                    ...prev,
                    date: '2024-06-01T09:00:00',
                }));
            });

            await act(async () => {
                await result.current.savePost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.date).toBe('2024-06-01T09:00:00');
        });

        it('appends :00 seconds to short date', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            act(() => {
                result.current.setPostData((prev) => ({
                    ...prev,
                    date: '2024-01-01T12:00',
                }));
            });

            await act(async () => {
                await result.current.savePost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.date).toBe('2024-01-01T12:00:00');
        });

        it('updates state and sets saveStatus to saved on success', async () => {
            apiFetch.mockResolvedValue({
                id: 42,
                slug: 'updated-slug',
                status: 'draft',
                date: '2024-01-15T10:30:00',
                modified: '2024-01-15T10:35:00',
            });

            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                await result.current.savePost();
            });

            expect(result.current.postData.slug).toBe('updated-slug');
            expect(result.current.saveStatus).toBe('saved');
        });

        it('updates initialDateRef so next save won\'t resend date', async () => {
            apiFetch.mockResolvedValue({
                id: 42,
                slug: 'test-post',
                status: 'draft',
                date: '2024-06-01T09:00:00',
                modified: '2024-06-01T09:00:00',
            });

            const { result } = renderHook(() => usePostData(defaultInitialData));

            // First save: change date
            act(() => {
                result.current.setPostData((prev) => ({
                    ...prev,
                    date: '2024-06-01T09:00:00',
                }));
            });
            await act(async () => {
                await result.current.savePost();
            });

            // Second save: date unchanged from what API returned
            apiFetch.mockClear();
            apiFetch.mockResolvedValue({
                id: 42,
                slug: 'test-post',
                status: 'draft',
                date: '2024-06-01T09:00:00',
                modified: '2024-06-01T09:01:00',
            });

            await act(async () => {
                await result.current.savePost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.date).toBeUndefined();
        });

        it('resets isDirty after successful save', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Changed' }));
            });
            expect(result.current.isDirty).toBe(true);

            await act(async () => {
                await result.current.savePost();
            });
            expect(result.current.isDirty).toBe(false);
        });

        it('sets saveStatus to error and re-throws on failure', async () => {
            apiFetch.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => usePostData(defaultInitialData));

            let caughtError;
            await act(async () => {
                try {
                    await result.current.savePost();
                } catch (err) {
                    caughtError = err;
                }
            });

            expect(caughtError).toBeInstanceOf(Error);
            expect(caughtError.message).toBe('Network error');
            expect(result.current.saveStatus).toBe('error');
        });

        it('queues second save call when already saving', async () => {
            let resolveFirst;
            apiFetch
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            resolveFirst = resolve;
                        })
                )
                .mockResolvedValueOnce({
                    id: 42,
                    slug: 'test-post',
                    status: 'publish',
                    date: '2024-01-15T10:30:00',
                    modified: '2024-01-15T10:35:00',
                });

            const { result } = renderHook(() => usePostData(defaultInitialData));

            // Start first save
            let firstSave;
            act(() => {
                firstSave = result.current.savePost();
            });

            // Second save should be queued (returns immediately)
            act(() => {
                result.current.savePost({ status: 'publish' });
            });

            // Resolve first save
            await act(async () => {
                resolveFirst({
                    id: 42,
                    slug: 'test-post',
                    status: 'draft',
                    date: '2024-01-15T10:30:00',
                    modified: '2024-01-15T10:32:00',
                });
                await firstSave;
            });

            // Wait for queued save to complete
            await act(async () => {
                await vi.waitFor(() => {
                    expect(apiFetch).toHaveBeenCalledTimes(2);
                });
            });

            // Second call should include publish override
            const secondBody = JSON.parse(apiFetch.mock.calls[1][1].body);
            expect(secondBody.status).toBe('publish');
        });
    });

    describe('savePost — behavioral edge cases', () => {
        it('uses rest_base from post data, not hardcoded "posts"', async () => {
            // A page post type has rest_base = 'pages'. If we hardcode 'posts'
            // the save goes to the wrong endpoint and WP returns 404.
            const pageData = { ...defaultInitialData, rest_base: 'pages', id: 99 };
            const { result } = renderHook(() => usePostData(pageData));

            await act(async () => {
                await result.current.savePost();
            });

            expect(apiFetch).toHaveBeenCalledWith('wp/v2/pages/99', expect.any(Object));
        });

        it('saves latest state even if called after rapid edits', async () => {
            // User types fast: title changes 3 times, then saves.
            // The save should send the LATEST title, not a stale closure.
            const { result } = renderHook(() => usePostData(defaultInitialData));

            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'First' }));
            });
            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Second' }));
            });
            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Final' }));
            });

            await act(async () => {
                await result.current.savePost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.title).toBe('Final');
        });

        it('status resets to idle after successful save timeout', async () => {
            vi.useFakeTimers();

            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                await result.current.savePost();
            });
            expect(result.current.saveStatus).toBe('saved');

            // After 2 seconds, should reset to idle
            act(() => {
                vi.advanceTimersByTime(2000);
            });
            expect(result.current.saveStatus).toBe('idle');

            vi.useRealTimers();
        });

        it('status resets to idle after error timeout', async () => {
            vi.useFakeTimers();
            apiFetch.mockRejectedValue(new Error('fail'));

            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                try { await result.current.savePost(); } catch {}
            });
            expect(result.current.saveStatus).toBe('error');

            // After 3 seconds, should reset to idle
            act(() => {
                vi.advanceTimersByTime(3000);
            });
            expect(result.current.saveStatus).toBe('idle');

            vi.useRealTimers();
        });

        it('publish during auto-save is not lost (queued save fires)', async () => {
            // Real scenario: auto-save starts, user clicks Publish during save.
            // The publish MUST happen after auto-save completes, not be silently dropped.
            let resolveAutoSave;
            apiFetch
                .mockImplementationOnce(() => new Promise((r) => { resolveAutoSave = r; }))
                .mockResolvedValueOnce({
                    id: 42, slug: 'test-post', status: 'publish',
                    date: '2024-01-15T10:30:00', modified: '2024-01-15T10:35:00',
                });

            const { result } = renderHook(() => usePostData(defaultInitialData));

            // Auto-save starts
            let autoSave;
            act(() => { autoSave = result.current.savePost(); });

            // User clicks Publish while auto-save in flight
            act(() => { result.current.publishPost(); });

            // Auto-save completes
            await act(async () => {
                resolveAutoSave({
                    id: 42, slug: 'test-post', status: 'draft',
                    date: '2024-01-15T10:30:00', modified: '2024-01-15T10:32:00',
                });
                await autoSave;
            });

            // Queued publish fires
            await act(async () => {
                await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
            });

            const publishBody = JSON.parse(apiFetch.mock.calls[1][1].body);
            expect(publishBody.status).toBe('publish');
        });

        it('edits after save make isDirty true again', async () => {
            const { result } = renderHook(() => usePostData(defaultInitialData));

            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Edit 1' }));
            });
            await act(async () => {
                await result.current.savePost();
            });
            expect(result.current.isDirty).toBe(false);

            // New edit after save
            act(() => {
                result.current.setPostData((prev) => ({ ...prev, title: 'Edit 2' }));
            });
            expect(result.current.isDirty).toBe(true);
        });
    });

    describe('publishPost', () => {
        it('calls savePost with status publish', async () => {
            apiFetch.mockResolvedValue({
                id: 42,
                slug: 'test-post',
                status: 'publish',
                date: '2024-01-15T10:30:00',
                modified: '2024-01-15T10:35:00',
            });

            const { result } = renderHook(() => usePostData(defaultInitialData));

            await act(async () => {
                await result.current.publishPost();
            });

            const body = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(body.status).toBe('publish');
        });
    });
});
