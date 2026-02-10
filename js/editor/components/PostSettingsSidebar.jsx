import React, { useCallback, useEffect } from 'react';
import FeaturedImage from './FeaturedImage';
import TaxonomySelector from './TaxonomySelector';

export default function PostSettingsSidebar({ postData, setPostData, onClose }) {
    const handleFieldChange = useCallback((field, value) => {
        setPostData((prev) => ({ ...prev, [field]: value }));
    }, [setPostData]);

    // Close sidebar on Escape key.
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <>
            <div className="koenig-sidebar-overlay" onClick={onClose} />
            <div className="koenig-sidebar">
                <div className="koenig-sidebar__header">
                    <h3>Post Settings</h3>
                    <button className="koenig-sidebar__close" onClick={onClose} title="Close">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                <div className="koenig-sidebar__body">
                    {/* URL Slug */}
                    <div className="koenig-sidebar__field">
                        <label>URL Slug</label>
                        <input
                            type="text"
                            value={postData.slug || ''}
                            onChange={(e) => handleFieldChange('slug', e.target.value)}
                        />
                    </div>

                    {/* Publish Date */}
                    <div className="koenig-sidebar__field">
                        <label>Publish Date</label>
                        <input
                            type="datetime-local"
                            value={postData.date ? postData.date.slice(0, 16) : ''}
                            onChange={(e) => handleFieldChange('date', e.target.value)}
                        />
                    </div>

                    {/* Excerpt */}
                    <div className="koenig-sidebar__field">
                        <label>Excerpt</label>
                        <textarea
                            rows={3}
                            value={postData.excerpt || ''}
                            onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                            placeholder="Add a short description..."
                        />
                    </div>

                    {/* Featured Image */}
                    <div className="koenig-sidebar__field">
                        <label>Featured Image</label>
                        <FeaturedImage
                            mediaId={postData.featured_media}
                            onChange={(id) => handleFieldChange('featured_media', id)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="koenig-sidebar__field">
                        <label>Categories</label>
                        <TaxonomySelector
                            taxonomy="categories"
                            selected={postData.categories || []}
                            onChange={(ids) => handleFieldChange('categories', ids)}
                        />
                    </div>

                    {/* Tags */}
                    <div className="koenig-sidebar__field">
                        <label>Tags</label>
                        <TaxonomySelector
                            taxonomy="tags"
                            selected={postData.tags || []}
                            onChange={(ids) => handleFieldChange('tags', ids)}
                        />
                    </div>

                    {/* Post Status */}
                    <div className="koenig-sidebar__field">
                        <label>Status</label>
                        <select
                            value={postData.status}
                            onChange={(e) => handleFieldChange('status', e.target.value)}
                        >
                            <option value="draft">Draft</option>
                            <option value="publish">Published</option>
                            <option value="pending">Pending Review</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
}
