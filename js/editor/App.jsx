import React, { useState, useCallback, useRef, useEffect } from 'react';
import PostStatusBar from './components/PostStatusBar';
import TitleField from './components/TitleField';
import EditorContainer from './components/EditorContainer';
import PostSettingsSidebar from './components/PostSettingsSidebar';
import usePostData from './hooks/usePostData';
import useAutoSave from './hooks/useAutoSave';

const config = window.wpKoenigConfig;

export default function App() {
    const editorRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    const {
        postData,
        setPostData,
        savePost,
        publishPost,
        saveStatus,
        isDirty,
    } = usePostData(config.postData);

    const handleTitleChange = useCallback((title) => {
        setPostData((prev) => ({ ...prev, title }));
    }, [setPostData]);

    // KoenigEditor onChange: receives editor state as JSON string (already serialized by EditorContainer).
    const handleStateChange = useCallback((lexicalJson) => {
        setPostData((prev) => ({ ...prev, lexical_state: lexicalJson }));
    }, [setPostData]);

    // HtmlOutputPlugin setHtml: receives rendered HTML string.
    const handleHtmlChange = useCallback((html) => {
        setPostData((prev) => ({ ...prev, content: html }));
    }, [setPostData]);

    const handleTitleEnter = useCallback(() => {
        if (editorRef.current?.focus) {
            editorRef.current.focus();
        }
    }, []);

    const handleToggleSidebar = useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);

    useAutoSave(isDirty, savePost);

    // Ctrl+S / Cmd+S keyboard shortcut to save.
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                savePost();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [savePost]);

    return (
        <div className={`koenig-app ${config.darkMode ? 'dark' : ''}`}>
            <PostStatusBar
                postData={postData}
                saveStatus={saveStatus}
                onSave={savePost}
                onPublish={publishPost}
                onToggleSidebar={handleToggleSidebar}
                backUrl={config.editPostListUrl}
                wordCount={config.showWordCount ? wordCount : null}
            />

            <div className="koenig-editor-main">
                <div className="koenig-editor-content">
                    <TitleField
                        value={postData.title}
                        onChange={handleTitleChange}
                        onEnter={handleTitleEnter}
                    />
                    <EditorContainer
                        ref={editorRef}
                        initialState={postData.lexical_state}
                        initialHtml={postData.content}
                        onStateChange={handleStateChange}
                        onHtmlChange={handleHtmlChange}
                        onWordCountChange={setWordCount}
                        darkMode={config.darkMode}
                        showWordCount={config.showWordCount}
                    />
                </div>
            </div>

            {sidebarOpen && (
                <PostSettingsSidebar
                    postData={postData}
                    setPostData={setPostData}
                    onClose={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
