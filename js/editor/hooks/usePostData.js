import { useState, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Manages post data state and provides save/publish functionality.
 */
export default function usePostData(initialData) {
    const [postData, setPostData] = useState({
        ...initialData,
        title: initialData.title || '',
        content: initialData.content || '',
        lexical_state: initialData.lexical_state || '',
        status: (!initialData.status || initialData.status === 'auto-draft') ? 'draft' : initialData.status,
        slug: initialData.slug || '',
        excerpt: initialData.excerpt || '',
        date: initialData.date || '',
        categories: initialData.categories || [],
        tags: initialData.tags || [],
        featured_media: initialData.featured_media || 0,
    });

    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
    const dirtyCounterRef = useRef(0);
    const savedCounterRef = useRef(0);
    const savingRef = useRef(false);
    const pendingOverridesRef = useRef(null);
    const postDataRef = useRef(postData);
    postDataRef.current = postData;
    const initialDateRef = useRef(initialData.date || '');

    // Wrap setPostData to track dirty state via counter.
    const setPostDataTracked = useCallback((updater) => {
        setPostData(updater);
        dirtyCounterRef.current += 1;
    }, []);

    const isDirty = dirtyCounterRef.current !== savedCounterRef.current;

    const savePost = useCallback(async (overrides = {}) => {
        // If already saving, queue overrides for a follow-up save.
        if (savingRef.current) {
            pendingOverridesRef.current = { ...(pendingOverridesRef.current || {}), ...overrides };
            return;
        }
        savingRef.current = true;
        setSaveStatus('saving');

        const dataToSave = { ...postDataRef.current, ...overrides };
        const restBase = dataToSave.rest_base || 'posts';
        const endpoint = `wp/v2/${restBase}/${dataToSave.id}`;

        try {
            const body = {
                title: dataToSave.title,
                content: dataToSave.content,
                status: dataToSave.status,
                slug: dataToSave.slug,
                excerpt: dataToSave.excerpt,
                categories: dataToSave.categories,
                tags: dataToSave.tags,
                featured_media: dataToSave.featured_media,
                lexical_state: dataToSave.lexical_state,
            };

            // Only send date if the user explicitly changed it from the initial value.
            if (dataToSave.date && dataToSave.date !== initialDateRef.current) {
                // Ensure full ISO 8601 format (datetime-local may omit seconds).
                let dateVal = dataToSave.date;
                if (dateVal.length === 16) {
                    dateVal += ':00';
                }
                body.date = dateVal;
            }

            const result = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body),
            });

            setPostData((prev) => ({
                ...prev,
                id: result.id,
                slug: result.slug,
                status: result.status,
                date: result.date,
                modified: result.modified,
            }));

            savedCounterRef.current = dirtyCounterRef.current;
            initialDateRef.current = result.date;
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);

            return result;
        } catch (err) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            throw err;
        } finally {
            savingRef.current = false;
            // Process any queued overrides (e.g. Publish clicked during auto-save).
            const pending = pendingOverridesRef.current;
            if (pending) {
                pendingOverridesRef.current = null;
                savePost(pending).catch(() => {});
            }
        }
    }, []);

    const publishPost = useCallback(async () => {
        return savePost({ status: 'publish' });
    }, [savePost]);

    return {
        postData,
        setPostData: setPostDataTracked,
        savePost,
        publishPost,
        saveStatus,
        isDirty,
    };
}
