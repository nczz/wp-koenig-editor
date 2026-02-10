import { renderHook } from '@testing-library/react';
import useAutoSave from '@/hooks/useAutoSave.js';

describe('useAutoSave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls savePost after 60 seconds when isDirty is true', () => {
        const savePost = vi.fn(() => Promise.resolve());

        renderHook(() => useAutoSave(true, savePost));

        vi.advanceTimersByTime(60000);

        expect(savePost).toHaveBeenCalledTimes(1);
    });

    it('does not call savePost after 60 seconds when isDirty is false', () => {
        const savePost = vi.fn(() => Promise.resolve());

        renderHook(() => useAutoSave(false, savePost));

        vi.advanceTimersByTime(60000);

        expect(savePost).not.toHaveBeenCalled();
    });

    it('clears interval on unmount', () => {
        const savePost = vi.fn(() => Promise.resolve());

        const { unmount } = renderHook(() => useAutoSave(true, savePost));

        unmount();

        vi.advanceTimersByTime(120000);

        expect(savePost).not.toHaveBeenCalled();
    });

    it('calls preventDefault on beforeunload when isDirty is true', () => {
        const savePost = vi.fn(() => Promise.resolve());

        renderHook(() => useAutoSave(true, savePost));

        const event = new Event('beforeunload', { cancelable: true });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(event, 'returnValue', { value: true, writable: true });
        window.dispatchEvent(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.returnValue).toBe('');
    });

    it('does not call preventDefault on beforeunload when isDirty is false', () => {
        const savePost = vi.fn(() => Promise.resolve());

        renderHook(() => useAutoSave(false, savePost));

        const event = new Event('beforeunload');
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        window.dispatchEvent(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    // --- Behavioral tests: real user scenarios ---

    it('saves repeatedly every 60 seconds, not just once', () => {
        // User leaves editor open for 5 minutes with unsaved changes.
        // Auto-save should fire 5 times, not just once.
        const savePost = vi.fn(() => Promise.resolve());

        renderHook(() => useAutoSave(true, savePost));

        vi.advanceTimersByTime(60000 * 3);

        expect(savePost).toHaveBeenCalledTimes(3);
    });

    it('keeps trying auto-save even after save failure', () => {
        // Network goes down, save fails. When network returns,
        // next interval should try again — not give up forever.
        const savePost = vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(undefined);

        renderHook(() => useAutoSave(true, savePost));

        // First interval: fails
        vi.advanceTimersByTime(60000);
        expect(savePost).toHaveBeenCalledTimes(1);

        // Second interval: should still try
        vi.advanceTimersByTime(60000);
        expect(savePost).toHaveBeenCalledTimes(2);
    });

    it('picks up isDirty change between intervals', () => {
        // User saves manually (isDirty becomes false), then makes a new edit
        // (isDirty becomes true again). Auto-save should NOT save when clean,
        // but SHOULD save once dirty again.
        const savePost = vi.fn(() => Promise.resolve());
        let isDirty = false;

        const { rerender } = renderHook(() => useAutoSave(isDirty, savePost));

        // First 60s: not dirty
        vi.advanceTimersByTime(60000);
        expect(savePost).not.toHaveBeenCalled();

        // User makes an edit
        isDirty = true;
        rerender();

        // Next 60s: dirty now
        vi.advanceTimersByTime(60000);
        expect(savePost).toHaveBeenCalledTimes(1);
    });

    it('removes beforeunload listener on unmount to avoid memory leaks', () => {
        const savePost = vi.fn(() => Promise.resolve());

        const { unmount } = renderHook(() => useAutoSave(true, savePost));
        unmount();

        // After unmount, beforeunload should not prevent navigation
        const event = new Event('beforeunload', { cancelable: true });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn(), writable: true });
        window.dispatchEvent(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});
