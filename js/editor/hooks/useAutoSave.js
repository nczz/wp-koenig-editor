import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-save hook.
 * - Saves every 60 seconds when there are unsaved changes.
 * - Warns before leaving the page with unsaved changes.
 */
export default function useAutoSave(isDirty, savePost) {
    const isDirtyRef = useRef(isDirty);
    isDirtyRef.current = isDirty;

    const savePostRef = useRef(savePost);
    savePostRef.current = savePost;

    // Auto-save interval.
    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirtyRef.current) {
                savePostRef.current().catch(() => {
                    // Silently fail auto-save; user will see error status.
                });
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    // Warn before leaving with unsaved changes.
    const handleBeforeUnload = useCallback((e) => {
        if (isDirtyRef.current) {
            e.preventDefault();
            e.returnValue = '';
        }
    }, []);

    useEffect(() => {
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [handleBeforeUnload]);
}
