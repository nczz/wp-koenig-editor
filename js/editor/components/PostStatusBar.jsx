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
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M14.7 11.1C14.5833 11.3083 14.5333 11.55 14.5667 11.7833L14.85 13.65C14.8833 13.875 14.8 14.1 14.6333 14.2667L13.8667 15.0333C13.7 15.2 13.475 15.2833 13.25 15.25L11.3833 14.9667C11.15 14.9333 10.9083 14.9833 10.7 15.1L9.4 15.85C9.2 15.9667 9.05 16.15 8.98333 16.3667L8.38333 18.15C8.30833 18.3667 8.14167 18.5417 7.925 18.625L6.925 19.0083C6.70833 19.0917 6.46667 19.075 6.26667 18.9583L4.6 17.95C4.4 17.8333 4.16667 17.7917 3.93333 17.8333L2.075 18.1667C1.85 18.2083 1.625 18.1333 1.45833 17.9667L0.691667 17.2C0.525 17.0333 0.441667 16.8083 0.475 16.5833L0.808333 14.7167C0.85 14.4833 0.808333 14.25 0.691667 14.05L0 12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
