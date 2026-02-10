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
        status: initialData.status || 'draft',
        slug: initialData.slug || '',
        excerpt: initialData.excerpt || '',
        categories: initialData.categories || [],
        tags: initialData.tags || [],
        featured_media: initialData.featured_media || 0,
    });

    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
    const dirtyCounterRef = useRef(0);
    const savedCounterRef = useRef(0);

    // Wrap setPostData to track dirty state via counter.
    const setPostDataTracked = useCallback((updater) => {
        setPostData(updater);
        dirtyCounterRef.current += 1;
    }, []);

    const isDirty = dirtyCounterRef.current !== savedCounterRef.current;

    const savePost = useCallback(async (overrides = {}) => {
        setSaveStatus('saving');

        const dataToSave = { ...postData, ...overrides };
        const restBase = dataToSave.rest_base || 'posts';
        const endpoint = `wp/v2/${restBase}/${dataToSave.id}`;

        try {
            const result = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    title: dataToSave.title,
                    content: dataToSave.content,
                    status: dataToSave.status,
                    slug: dataToSave.slug,
                    excerpt: dataToSave.excerpt,
                    categories: dataToSave.categories,
                    tags: dataToSave.tags,
                    featured_media: dataToSave.featured_media,
                    lexical_state: dataToSave.lexical_state,
                }),
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
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);

            return result;
        } catch (err) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            throw err;
        }
    }, [postData]);

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
