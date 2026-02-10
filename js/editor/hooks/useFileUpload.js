import { useCallback, useMemo } from 'react';
import { uploadFile } from '../utils/api';

/**
 * Implements the fileUploader interface expected by KoenigComposer.
 * Bridges Koenig's file upload to WordPress media library via REST API.
 */
export default function useFileUpload() {
    const upload = useCallback(async (files) => {
        const results = [];
        for (const file of files) {
            const result = await uploadFile(file);
            results.push({
                url: result.url,
                fileName: result.fileName,
                width: result.width,
                height: result.height,
            });
        }
        return results;
    }, []);

    const fileUploader = useMemo(() => ({
        useFileUpload: () => ({
            upload,
            isLoading: false,
            errors: [],
            progress: 100,
        }),
    }), [upload]);

    return fileUploader;
}
