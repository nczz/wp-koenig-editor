import { useCallback, useState, useRef } from 'react';
import { uploadFile } from '../utils/api';

/**
 * Implements the fileUploader interface expected by KoenigComposer.
 * Uses a ref-stable outer object to avoid re-rendering the entire editor
 * tree on every upload state change. The inner useFileUpload hook returned
 * by the outer object uses React state for reactive updates within cards.
 */
export default function useFileUpload() {
    // The fileUploader object is created once and stays referentially stable.
    // KoenigComposer stores it in context, so stability prevents full re-renders.
    const fileUploaderRef = useRef(null);

    if (!fileUploaderRef.current) {
        fileUploaderRef.current = {
            useFileUpload: useFileUploadState,
        };
    }

    return fileUploaderRef.current;
}

/**
 * Inner hook called by Koenig card components.
 * Each card instance gets its own isolated upload state.
 * Must start with "use" to comply with React's rules of hooks.
 */
function useFileUploadState() {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [progress, setProgress] = useState(0);

    const upload = useCallback(async (files) => {
        setIsLoading(true);
        setErrors([]);
        setProgress(0);

        const results = [];
        const totalFiles = files.length;

        for (let i = 0; i < totalFiles; i++) {
            try {
                const result = await uploadFile(files[i]);
                results.push({
                    url: result.url,
                    fileName: result.fileName,
                    width: result.width,
                    height: result.height,
                });
                setProgress(Math.round(((i + 1) / totalFiles) * 100));
            } catch (err) {
                setErrors((prev) => [...prev, { message: err.message, fileName: files[i].name }]);
            }
        }

        setIsLoading(false);
        return results;
    }, []);

    return { upload, isLoading, errors, progress };
}
