import React from 'react';

export default function PostStatusBar({ postData, saveStatus, onSave, onPublish, onToggleSidebar, backUrl, wordCount }) {
    const isPublished = postData.status === 'publish';
    const statusText = {
        idle: '',
        saving: 'Saving...',
        saved: 'Saved',
        error: 'Save failed',
    }[saveStatus] || '';

    return (
        <div className="koenig-status-bar">
            <div className="koenig-status-bar__left">
                <a href={backUrl} className="koenig-status-bar__back" title="Back to posts">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Posts</span>
                </a>
            </div>

            <div className="koenig-status-bar__center">
                {statusText && (
                    <span className={`koenig-save-status koenig-save-status--${saveStatus}`}>
                        {statusText}
                    </span>
                )}
                {wordCount !== null && wordCount !== undefined && (
                    <span className="koenig-word-count">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                )}
            </div>

            <div className="koenig-status-bar__right">
                {postData.preview_url && (
                    <a
                        href={postData.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="koenig-btn koenig-btn--text"
                    >
                        Preview
                    </a>
                )}

                <button
                    type="button"
                    className="koenig-btn koenig-btn--icon"
                    onClick={onToggleSidebar}
                    title="Post settings"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                </button>

                <button
                    type="button"
                    className="koenig-btn koenig-btn--secondary"
                    onClick={onSave}
                    disabled={saveStatus === 'saving'}
                >
                    {saveStatus === 'saving' ? 'Saving...' : (isPublished ? 'Save' : 'Save Draft')}
                </button>

                <button
                    type="button"
                    className="koenig-btn koenig-btn--primary"
                    onClick={onPublish}
                    disabled={saveStatus === 'saving'}
                >
                    {isPublished ? 'Update' : 'Publish'}
                </button>
            </div>
        </div>
    );
}
