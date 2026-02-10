/**
 * Cross-module integration tests.
 *
 * These tests verify behavior that spans multiple hooks/utils,
 * ensuring the modules work correctly together as a system.
 */
import { renderHook, act } from '@testing-library/react';
import usePostData from '@/hooks/usePostData.js';
import useAutoSave from '@/hooks/useAutoSave.js';

vi.mock('@/utils/api.js', () => ({
    apiFetch: vi.fn(),
}));

import { apiFetch } from '@/utils/api.js';

const makeInitialData = (overrides = {}) => ({
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
    ...overrides,
});

describe('Cross-module integration', () => {
    beforeEach(() => {
        apiFetch.mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('useAutoSave triggers usePostData.savePost when dirty', async () => {
        // Scenario: User types in the editor. 60 seconds later,
        // auto-save fires and successfully saves the post.
        apiFetch.mockResolvedValue({
            id: 42,
            slug: 'test-post',
            status: 'draft',
            date: '2024-01-15T10:30:00',
            modified: '2024-01-15T10:31:00',
        });

        const { result } = renderHook(() => {
            const postDataHook = usePostData(makeInitialData());
            useAutoSave(postDataHook.isDirty, postDataHook.savePost);
            return postDataHook;
        });

        // Make a change (sets isDirty = true)
        act(() => {
            result.current.setPostData((prev) => ({ ...prev, title: 'Updated' }));
        });
        expect(result.current.isDirty).toBe(true);

        // Advance 60 seconds — auto-save should fire
        await act(async () => {
            vi.advanceTimersByTime(60000);
        });

        expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it('useAutoSave does not fire when isDirty is false after manual save', async () => {
        // Scenario: User types, manually clicks Save, then waits.
        // Auto-save should NOT fire because the post is clean.
        apiFetch.mockResolvedValue({
            id: 42,
            slug: 'test-post',
            status: 'draft',
            date: '2024-01-15T10:30:00',
            modified: '2024-01-15T10:31:00',
        });

        const { result } = renderHook(() => {
            const postDataHook = usePostData(makeInitialData());
            useAutoSave(postDataHook.isDirty, postDataHook.savePost);
            return postDataHook;
        });

        // Make a change
        act(() => {
            result.current.setPostData((prev) => ({ ...prev, title: 'Updated' }));
        });

        // Manually save
        await act(async () => {
            await result.current.savePost();
        });
        expect(result.current.isDirty).toBe(false);

        // Reset mock to track subsequent calls
        apiFetch.mockClear();

        // Advance 60 seconds — auto-save should NOT fire (not dirty)
        await act(async () => {
            vi.advanceTimersByTime(60000);
        });

        expect(apiFetch).not.toHaveBeenCalled();
    });

    it('save queuing: publish during auto-save completes both operations', async () => {
        // Scenario: Auto-save starts. While it's in-flight, user clicks Publish.
        // The publish should be queued and execute after auto-save completes.
        // This verifies usePostData's pendingOverridesRef mechanism works
        // with real auto-save timing.
        let resolveSave;
        apiFetch
            .mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }))
            .mockResolvedValueOnce({
                id: 42,
                slug: 'test-post',
                status: 'publish',
                date: '2024-01-15T10:30:00',
                modified: '2024-01-15T10:32:00',
            });

        const { result } = renderHook(() => {
            const postDataHook = usePostData(makeInitialData());
            useAutoSave(postDataHook.isDirty, postDataHook.savePost);
            return postDataHook;
        });

        // Make a change to trigger auto-save
        act(() => {
            result.current.setPostData((prev) => ({ ...prev, title: 'Updated' }));
        });

        // Auto-save fires (starts first save)
        act(() => {
            vi.advanceTimersByTime(60000);
        });
        expect(result.current.saveStatus).toBe('saving');

        // User clicks Publish while auto-save is in-flight
        act(() => {
            result.current.publishPost();
        });

        // Resolve the auto-save
        await act(async () => {
            resolveSave({
                id: 42,
                slug: 'test-post',
                status: 'draft',
                date: '2024-01-15T10:30:00',
                modified: '2024-01-15T10:31:00',
            });
        });

        // The publish save should have been triggered as a follow-up
        // (2 total apiFetch calls: auto-save + queued publish)
        expect(apiFetch).toHaveBeenCalledTimes(2);

        // The second call should contain status: 'publish'
        const secondCallBody = JSON.parse(apiFetch.mock.calls[1][1].body);
        expect(secondCallBody.status).toBe('publish');
    });

    it('complete edit-save-dirty cycle tracks state correctly', async () => {
        // Full user workflow: edit → save → edit again → should be dirty again.
        apiFetch.mockResolvedValue({
            id: 42,
            slug: 'test-post',
            status: 'draft',
            date: '2024-01-15T10:30:00',
            modified: '2024-01-15T10:31:00',
        });

        const { result } = renderHook(() => usePostData(makeInitialData()));

        // Initially clean
        expect(result.current.isDirty).toBe(false);

        // Edit
        act(() => {
            result.current.setPostData((prev) => ({ ...prev, title: 'First edit' }));
        });
        expect(result.current.isDirty).toBe(true);

        // Save
        await act(async () => {
            await result.current.savePost();
        });
        expect(result.current.isDirty).toBe(false);
        expect(result.current.saveStatus).toBe('saved');

        // Edit again
        act(() => {
            result.current.setPostData((prev) => ({ ...prev, title: 'Second edit' }));
        });
        expect(result.current.isDirty).toBe(true);

        // Save again
        await act(async () => {
            await result.current.savePost();
        });
        expect(result.current.isDirty).toBe(false);
    });
});
