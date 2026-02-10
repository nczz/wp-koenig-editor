import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { KoenigComposer, KoenigEditor, HtmlOutputPlugin } from '@tryghost/koenig-lexical';
import useFileUpload from '../hooks/useFileUpload';
import { cardConfig } from '../utils/card-config';

const EditorContainer = forwardRef(function EditorContainer(
    { initialState, initialHtml, onStateChange, onHtmlChange, darkMode },
    ref,
) {
    const editorAPIRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus() {
            editorAPIRef.current?.focusEditor?.();
        },
    }));

    const fileUploader = useFileUpload();

    const handleEditorAPI = useCallback((api) => {
        editorAPIRef.current = api;
    }, []);

    // onChange from KoenigEditor receives editorState as a plain object (.toJSON()).
    const handleChange = useCallback((stateObj) => {
        onStateChange(JSON.stringify(stateObj));
    }, [onStateChange]);

    const initialEditorState = useMemo(() => {
        if (initialState && initialState.length > 0) {
            try {
                JSON.parse(initialState);
                return initialState;
            } catch {
                return undefined;
            }
        }
        return undefined;
    }, [initialState]);

    return (
        <div className={`koenig-editor-container ${darkMode ? 'dark' : ''}`}>
            <KoenigComposer
                cardConfig={cardConfig}
                fileUploader={fileUploader}
                initialEditorState={initialEditorState}
            >
                <KoenigEditor
                    onChange={handleChange}
                    registerAPI={handleEditorAPI}
                    cursorDidExitAtTop={() => {
                        const titleEl = document.querySelector('.koenig-title-field');
                        if (titleEl) {
                            titleEl.focus();
                            titleEl.selectionStart = titleEl.selectionEnd = titleEl.value.length;
                        }
                    }}
                />
                <HtmlOutputPlugin html={initialHtml} setHtml={onHtmlChange} />
            </KoenigComposer>
        </div>
    );
});

export default EditorContainer;
