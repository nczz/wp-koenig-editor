import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeaturedImage from '@/components/FeaturedImage.jsx';

vi.mock('@/utils/api.js', () => ({
    apiFetch: vi.fn(),
}));

vi.mock('@/hooks/useMediaLibrary.js', () => ({
    default: () => vi.fn(),
}));

import { apiFetch } from '@/utils/api.js';

describe('FeaturedImage', () => {
    beforeEach(() => {
        apiFetch.mockReset();
    });

    it('shows "Add Featured Image" button when mediaId is 0', () => {
        render(<FeaturedImage mediaId={0} onChange={() => {}} />);

        expect(screen.getByText('Add Featured Image')).toBeInTheDocument();
    });

    it('shows image and Replace/Remove buttons when mediaId > 0', async () => {
        apiFetch.mockResolvedValue({
            source_url: 'https://example.com/photo.jpg',
            media_details: { sizes: { medium: { source_url: 'https://example.com/photo-300x200.jpg' } } },
        });

        render(<FeaturedImage mediaId={10} onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByAltText('Featured')).toBeInTheDocument();
        });

        expect(screen.getByText('Replace')).toBeInTheDocument();
        expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('calls onChange(0) when Remove is clicked', async () => {
        apiFetch.mockResolvedValue({
            source_url: 'https://example.com/photo.jpg',
            media_details: { sizes: {} },
        });

        const onChange = vi.fn();
        render(<FeaturedImage mediaId={10} onChange={onChange} />);

        await waitFor(() => {
            expect(screen.getByText('Remove')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Remove'));

        expect(onChange).toHaveBeenCalledWith(0);
    });

    it('cancels previous fetch on rapid mediaId changes', async () => {
        let resolveFirst;
        apiFetch
            .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
            .mockResolvedValueOnce({
                source_url: 'https://example.com/second.jpg',
                media_details: { sizes: {} },
            });

        const { rerender } = render(<FeaturedImage mediaId={10} onChange={() => {}} />);

        // Immediately change mediaId before first fetch resolves
        rerender(<FeaturedImage mediaId={20} onChange={() => {}} />);

        // Resolve first fetch after rerender
        resolveFirst({
            source_url: 'https://example.com/first.jpg',
            media_details: { sizes: {} },
        });

        await waitFor(() => {
            expect(screen.getByAltText('Featured')).toBeInTheDocument();
        });

        // Should show second image, not first (cancelled)
        expect(screen.getByAltText('Featured').src).toBe('https://example.com/second.jpg');
    });

    // --- Behavioral tests ---

    it('prefers medium size for performance, falls back to source_url', async () => {
        // Large images slow the sidebar. We want the medium thumbnail when available.
        apiFetch.mockResolvedValue({
            source_url: 'https://example.com/huge-4000x3000.jpg',
            media_details: {
                sizes: {
                    medium: { source_url: 'https://example.com/medium-300x200.jpg' },
                },
            },
        });

        render(<FeaturedImage mediaId={10} onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByAltText('Featured')).toBeInTheDocument();
        });

        expect(screen.getByAltText('Featured').src).toBe('https://example.com/medium-300x200.jpg');
    });

    it('falls back to source_url when no medium size exists', async () => {
        // SVGs and small images may not have generated thumbnails.
        apiFetch.mockResolvedValue({
            source_url: 'https://example.com/logo.svg',
            media_details: { sizes: {} },
        });

        render(<FeaturedImage mediaId={10} onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByAltText('Featured')).toBeInTheDocument();
        });

        expect(screen.getByAltText('Featured').src).toBe('https://example.com/logo.svg');
    });

    it('reverts to Add button after Remove is clicked', async () => {
        apiFetch.mockResolvedValue({
            source_url: 'https://example.com/photo.jpg',
            media_details: { sizes: {} },
        });

        render(<FeaturedImage mediaId={10} onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByText('Remove')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Remove'));

        // Should go back to the "Add Featured Image" button
        expect(screen.getByText('Add Featured Image')).toBeInTheDocument();
        expect(screen.queryByAltText('Featured')).not.toBeInTheDocument();
    });

    it('shows Add button when API fetch fails (e.g. deleted media)', async () => {
        // Featured media ID points to a deleted attachment.
        // Should degrade gracefully, not show a broken image.
        apiFetch.mockRejectedValue(new Error('Not found'));

        render(<FeaturedImage mediaId={999} onChange={() => {}} />);

        // After error, should show the add button (empty imageUrl)
        await waitFor(() => {
            expect(screen.getByText('Add Featured Image')).toBeInTheDocument();
        });
    });
});
