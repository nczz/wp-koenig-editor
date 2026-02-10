import { useCallback } from 'react';

/**
 * Hook to open the WordPress media library modal.
 * Requires wp_enqueue_media() to be called on the PHP side.
 */
export default function useMediaLibrary() {
    const openMediaLibrary = useCallback(({ title, button, multiple = false, onSelect }) => {
        // wp.media is loaded by wp_enqueue_media().
        if (typeof wp === 'undefined' || !wp.media) {
            console.error('WordPress media library not available.');
            return;
        }

        const frame = wp.media({
            title: title || 'Select Media',
            button: { text: button || 'Select' },
            multiple,
        });

        frame.on('select', () => {
            if (multiple) {
                const attachments = frame.state().get('selection').map((att) => att.toJSON());
                onSelect(attachments);
            } else {
                const attachment = frame.state().get('selection').first().toJSON();
                onSelect(attachment);
            }
        });

        frame.open();
    }, []);

    return openMediaLibrary;
}
