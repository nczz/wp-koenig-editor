import { renderHook, act } from '@testing-library/react';
import useFileUpload from '@/hooks/useFileUpload.js';

vi.mock('@/utils/api.js', () => ({
    uploadFile: vi.fn(),
}));

import { uploadFile } from '@/utils/api.js';

describe('useFileUpload', () => {
    beforeEach(() => {
        uploadFile.mockReset();
    });

    it('returns an object with useFileUpload method', () => {
        const { result } = renderHook(() => useFileUpload());

        expect(typeof result.current.useFileUpload).toBe('function');
    });

    it('returns referentially stable object across re-renders', () => {
        const { result, rerender } = renderHook(() => useFileUpload());

        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    describe('useFileUploadState (inner hook)', () => {
        // Helper: render both the outer and inner hook together
        function renderUploadState() {
            return renderHook(() => {
                const fileUploader = useFileUpload();
                const state = fileUploader.useFileUpload();
                return state;
            });
        }

        it('upload succeeds and returns results', async () => {
            uploadFile.mockResolvedValue({
                url: 'https://example.com/photo.jpg',
                fileName: 'photo.jpg',
                width: 800,
                height: 600,
            });

            const { result } = renderUploadState();
            const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });

            let uploadResult;
            await act(async () => {
                uploadResult = await result.current.upload([file]);
            });

            expect(uploadResult).toEqual([
                {
                    url: 'https://example.com/photo.jpg',
                    fileName: 'photo.jpg',
                    width: 800,
                    height: 600,
                },
            ]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.progress).toBe(100);
        });

        it('sets isLoading to true during upload', async () => {
            let resolveUpload;
            uploadFile.mockImplementation(
                () => new Promise((resolve) => { resolveUpload = resolve; })
            );

            const { result } = renderUploadState();
            const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });

            let uploadPromise;
            act(() => {
                uploadPromise = result.current.upload([file]);
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolveUpload({
                    url: 'https://example.com/photo.jpg',
                    fileName: 'photo.jpg',
                    width: 800,
                    height: 600,
                });
                await uploadPromise;
            });

            expect(result.current.isLoading).toBe(false);
        });

        it('tracks progress across multiple files', async () => {
            uploadFile
                .mockResolvedValueOnce({ url: 'a.jpg', fileName: 'a.jpg', width: 100, height: 100 })
                .mockResolvedValueOnce({ url: 'b.jpg', fileName: 'b.jpg', width: 200, height: 200 });

            const { result } = renderUploadState();
            const files = [
                new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
            ];

            await act(async () => {
                await result.current.upload(files);
            });

            expect(result.current.progress).toBe(100);
        });

        it('collects errors for failed uploads', async () => {
            uploadFile
                .mockResolvedValueOnce({ url: 'a.jpg', fileName: 'a.jpg', width: 100, height: 100 })
                .mockRejectedValueOnce(new Error('File too large'));

            const { result } = renderUploadState();
            const files = [
                new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['b'], 'big.jpg', { type: 'image/jpeg' }),
            ];

            await act(async () => {
                await result.current.upload(files);
            });

            expect(result.current.errors).toEqual([
                { message: 'File too large', fileName: 'big.jpg' },
            ]);
            expect(result.current.isLoading).toBe(false);
        });

        // --- Behavioral tests ---

        it('returns successful results even when some files fail', async () => {
            // User drags 3 images. One fails (too large). The other 2
            // should still be inserted into the editor — not all lost.
            uploadFile
                .mockResolvedValueOnce({ url: 'a.jpg', fileName: 'a.jpg', width: 100, height: 100 })
                .mockRejectedValueOnce(new Error('Too large'))
                .mockResolvedValueOnce({ url: 'c.jpg', fileName: 'c.jpg', width: 300, height: 300 });

            const { result } = renderUploadState();

            let uploadResult;
            await act(async () => {
                uploadResult = await result.current.upload([
                    new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
                    new File(['b'], 'big.jpg', { type: 'image/jpeg' }),
                    new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
                ]);
            });

            // 2 successful, 1 error
            expect(uploadResult).toHaveLength(2);
            expect(result.current.errors).toHaveLength(1);
            expect(result.current.errors[0].fileName).toBe('big.jpg');
        });

        it('handles empty file array without crashing', async () => {
            // Edge case: user triggers upload with no files selected
            const { result } = renderUploadState();

            let uploadResult;
            await act(async () => {
                uploadResult = await result.current.upload([]);
            });

            expect(uploadResult).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.errors).toEqual([]);
        });

        it('clears previous errors when starting a new upload', async () => {
            // First upload: one file fails
            uploadFile.mockRejectedValueOnce(new Error('fail'));
            const { result } = renderUploadState();

            await act(async () => {
                await result.current.upload([new File(['x'], 'bad.jpg', { type: 'image/jpeg' })]);
            });
            expect(result.current.errors).toHaveLength(1);

            // Second upload: succeeds. Old errors should be cleared.
            uploadFile.mockResolvedValueOnce({ url: 'ok.jpg', fileName: 'ok.jpg', width: 100, height: 100 });
            await act(async () => {
                await result.current.upload([new File(['y'], 'ok.jpg', { type: 'image/jpeg' })]);
            });
            expect(result.current.errors).toEqual([]);
        });
    });
});
