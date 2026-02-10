import React, { useState, useEffect, useCallback } from 'react';
import useMediaLibrary from '../hooks/useMediaLibrary';
import { apiFetch } from '../utils/api';

export default function FeaturedImage({ mediaId, onChange }) {
    const [imageUrl, setImageUrl] = useState('');
    const openMediaLibrary = useMediaLibrary();

    // Fetch current featured image URL with abort on rapid changes.
    useEffect(() => {
        if (!mediaId) {
            setImageUrl('');
            return;
        }
        let cancelled = false;
        apiFetch(`wp/v2/media/${mediaId}`)
            .then((media) => {
                if (cancelled) return;
                const url = media?.media_details?.sizes?.medium?.source_url
                    || media?.source_url
                    || '';
                setImageUrl(url);
            })
            .catch(() => {
                if (!cancelled) setImageUrl('');
            });
        return () => { cancelled = true; };
    }, [mediaId]);

    const handleSelect = useCallback(() => {
        openMediaLibrary({
            title: 'Select Featured Image',
            button: 'Set Featured Image',
            multiple: false,
            onSelect: (attachment) => {
                onChange(attachment.id);
                const url = attachment.sizes?.medium?.url || attachment.url;
                setImageUrl(url);
            },
        });
    }, [openMediaLibrary, onChange]);

    const handleRemove = useCallback(() => {
        onChange(0);
        setImageUrl('');
    }, [onChange]);

    if (imageUrl) {
        return (
            <div className="koenig-featured-image">
                <img src={imageUrl} alt="Featured" />
                <div className="koenig-featured-image__actions">
                    <button type="button" onClick={handleSelect}>Replace</button>
                    <button type="button" onClick={handleRemove}>Remove</button>
                </div>
            </div>
        );
    }

    return (
        <button type="button" className="koenig-btn koenig-btn--secondary" onClick={handleSelect}>
            Add Featured Image
        </button>
    );
}
