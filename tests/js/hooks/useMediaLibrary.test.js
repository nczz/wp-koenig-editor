import { renderHook, act } from '@testing-library/react';
import useMediaLibrary from '@/hooks/useMediaLibrary.js';

describe('useMediaLibrary', () => {
    let mockFrame;

    beforeEach(() => {
        // Build a mock wp.media frame
        mockFrame = {
            on: vi.fn(),
            open: vi.fn(),
            state: vi.fn(() => ({
                get: vi.fn(() => ({
                    first: () => ({
                        toJSON: () => ({
                            id: 10,
                            url: 'https://example.com/photo.jpg',
                            width: 800,
                            height: 600,
                        }),
                    }),
                    map: (fn) => [
                        fn({ toJSON: () => ({ id: 10, url: 'a.jpg' }) }),
                        fn({ toJSON: () => ({ id: 11, url: 'b.jpg' }) }),
                    ],
                })),
            })),
        };

        // Define global wp.media
        global.wp = {
            media: vi.fn(() => mockFrame),
        };
    });

    afterEach(() => {
        delete global.wp;
    });

    it('calls wp.media with correct title and button', () => {
        const { result } = renderHook(() => useMediaLibrary());

        act(() => {
            result.current({
                title: 'Pick Image',
                button: 'Use This',
                onSelect: vi.fn(),
            });
        });

        expect(global.wp.media).toHaveBeenCalledWith({
            title: 'Pick Image',
            button: { text: 'Use This' },
            multiple: false,
        });
        expect(mockFrame.open).toHaveBeenCalled();
    });

    it('single select: onSelect receives single attachment', () => {
        const { result } = renderHook(() => useMediaLibrary());
        const onSelect = vi.fn();

        act(() => {
            result.current({ title: 'Pick', button: 'Select', onSelect });
        });

        // Simulate the frame emitting 'select'
        const selectCallback = mockFrame.on.mock.calls.find(([event]) => event === 'select')[1];
        selectCallback();

        expect(onSelect).toHaveBeenCalledWith({
            id: 10,
            url: 'https://example.com/photo.jpg',
            width: 800,
            height: 600,
        });
    });

    it('logs error when wp.media is not available', () => {
        delete global.wp;
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useMediaLibrary());

        act(() => {
            result.current({ title: 'Pick', button: 'Select', onSelect: vi.fn() });
        });

        expect(consoleSpy).toHaveBeenCalledWith('WordPress media library not available.');
        consoleSpy.mockRestore();
    });
});
