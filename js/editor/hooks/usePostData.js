import { useState, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Manages post data state and provides save/publish functionality.
 */
export default function usePostData(initialData) {
    const [postData, setPostData] = useState({
        ...initialData,
        // Ensure we have default values.
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
    const lastSavedRef = useRef(JSON.stringify(initialData));

    const isDirty = JSON.stringify(postData) !== lastSavedRef.current;

    const savePost = useCallback(async (overrides = {}) => {
        setSaveStatus('saving');

        const dataToSave = { ...postData, ...overrides };
        const postType = dataToSave.post_type || 'post';
        const endpoint = postType === 'post'
            ? `wp/v2/posts/${dataToSave.id}`
            : `wp/v2/${postType}/${dataToSave.id}`;

        try {
            const result = await apiFetch(endpoint, {
                method: 'PUT',
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

            // Update post data with server response.
            setPostData((prev) => ({
                ...prev,
                id: result.id,
                slug: result.slug,
                status: result.status,
                date: result.date,
                modified: result.modified,
            }));

            lastSavedRef.current = JSON.stringify({ ...dataToSave, ...result });
            setSaveStatus('saved');

            // Reset status after 2 seconds.
            setTimeout(() => setSaveStatus('idle'), 2000);

            return result;
        } catch (err) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            throw err;
        }
    }, [postData]);

    const publishPost = useCallback(async () => {
        const newStatus = postData.status === 'publish' ? 'publish' : 'publish';
        return savePost({ status: newStatus });
    }, [postData.status, savePost]);

    return {
        postData,
        setPostData,
        savePost,
        publishPost,
        saveStatus,
        isDirty,
    };
}
