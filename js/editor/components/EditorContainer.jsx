import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { KoenigComposer, KoenigEditor } from '@tryghost/koenig-lexical';
import useFileUpload from '../hooks/useFileUpload';
import { cardConfig } from '../utils/card-config';

const EditorContainer = forwardRef(function EditorContainer({ initialState, onChange, darkMode }, ref) {
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
                    onChange={onChange}
                    registerAPI={handleEditorAPI}
                    cursorDidExitAtTop={() => {
                        // Focus title field when cursor exits top of editor.
                        const titleEl = document.querySelector('.koenig-title-field');
                        if (titleEl) {
                            titleEl.focus();
                            // Move cursor to end.
                            titleEl.selectionStart = titleEl.selectionEnd = titleEl.value.length;
                        }
                    }}
                />
            </KoenigComposer>
        </div>
    );
});

export default EditorContainer;
