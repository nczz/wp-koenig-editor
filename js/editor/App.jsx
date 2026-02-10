import React, { useState, useCallback, useRef } from 'react';
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

    const handleEditorChange = useCallback((editorState, htmlContent) => {
        setPostData((prev) => ({
            ...prev,
            lexical_state: JSON.stringify(editorState),
            content: htmlContent,
        }));
    }, [setPostData]);

    const handleTitleEnter = useCallback(() => {
        if (editorRef.current?.focus) {
            editorRef.current.focus();
        }
    }, []);

    useAutoSave(isDirty, savePost);

    return (
        <div className={`koenig-app ${config.darkMode ? 'dark' : ''}`}>
            <PostStatusBar
                postData={postData}
                saveStatus={saveStatus}
                onSave={savePost}
                onPublish={publishPost}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                backUrl={config.editPostListUrl}
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
                        onChange={handleEditorChange}
                        darkMode={config.darkMode}
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
