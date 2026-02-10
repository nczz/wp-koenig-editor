import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { KoenigComposer, KoenigEditor, HtmlOutputPlugin, WordCountPlugin } from '@tryghost/koenig-lexical';
import useFileUpload from '../hooks/useFileUpload';
import { cardConfig } from '../utils/card-config';

const EditorContainer = forwardRef(function EditorContainer(
    { initialState, initialHtml, onStateChange, onHtmlChange, onWordCountChange, darkMode, showWordCount },
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

    // Only pass html to HtmlOutputPlugin when there is NO Lexical state
    // (i.e., importing from a legacy/classic post). When Lexical state exists,
    // it is loaded via initialEditorState and HtmlOutputPlugin should NOT
    // re-import HTML which would overwrite the richer Lexical JSON data.
    const htmlForImport = initialEditorState ? '' : (initialHtml || '');

    return (
        <div className="koenig-editor-container">
            <KoenigComposer
                cardConfig={cardConfig}
                fileUploader={fileUploader}
                initialEditorState={initialEditorState}
                darkMode={darkMode}
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
                <HtmlOutputPlugin html={htmlForImport} setHtml={onHtmlChange} />
                {showWordCount && onWordCountChange && (
                    <WordCountPlugin onChange={onWordCountChange} />
                )}
            </KoenigComposer>
        </div>
    );
});

export default EditorContainer;
