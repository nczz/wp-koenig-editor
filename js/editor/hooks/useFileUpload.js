import { useCallback, useState, useMemo } from 'react';
import { uploadFile } from '../utils/api';

/**
 * Implements the fileUploader interface expected by KoenigComposer.
 * Bridges Koenig's file upload to WordPress media library via REST API.
 * Provides reactive isLoading, errors, and progress state.
 */
export default function useFileUpload() {
    // Shared state for the inner hook.
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

    const fileUploader = useMemo(() => ({
        useFileUpload: () => ({
            upload,
            isLoading,
            errors,
            progress,
        }),
    }), [upload, isLoading, errors, progress]);

    return fileUploader;
}
