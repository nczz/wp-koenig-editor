import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostSettingsSidebar from '@/components/PostSettingsSidebar.jsx';

// Mock child components to isolate sidebar logic
vi.mock('@/components/FeaturedImage.jsx', () => ({
    default: ({ mediaId, onChange }) => (
        <div data-testid="featured-image">mediaId={mediaId}</div>
    ),
}));

vi.mock('@/components/TaxonomySelector.jsx', () => ({
    default: ({ taxonomy, selected, onChange }) => (
        <div data-testid={`taxonomy-${taxonomy}`}>
            {taxonomy}: {selected.join(',')}
        </div>
    ),
}));

const basePostData = {
    slug: 'test-post',
    date: '2024-01-15T10:30:00',
    excerpt: 'A summary',
    featured_media: 0,
    categories: [1],
    tags: [],
    status: 'draft',
};

describe('PostSettingsSidebar', () => {
    it('renders all fields: slug, date, excerpt, categories, tags, status', () => {
        render(
            <PostSettingsSidebar
                postData={basePostData}
                setPostData={() => {}}
                onClose={() => {}}
            />
        );

        // Labels are not linked via htmlFor, so query by text + sibling inputs
        expect(screen.getByText('URL Slug')).toBeInTheDocument();
        expect(screen.getByText('Publish Date')).toBeInTheDocument();
        expect(screen.getByText('Excerpt')).toBeInTheDocument();
        expect(screen.getByTestId('featured-image')).toBeInTheDocument();
        expect(screen.getByTestId('taxonomy-categories')).toBeInTheDocument();
        expect(screen.getByTestId('taxonomy-tags')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();

        // Verify actual input values
        expect(screen.getByDisplayValue('test-post')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2024-01-15T10:30')).toBeInTheDocument();
        expect(screen.getByDisplayValue('A summary')).toBeInTheDocument();
    });

    it('calls setPostData when slug is changed', () => {
        const setPostData = vi.fn();
        render(
            <PostSettingsSidebar
                postData={basePostData}
                setPostData={setPostData}
                onClose={() => {}}
            />
        );

        fireEvent.change(screen.getByDisplayValue('test-post'), {
            target: { value: 'new-slug' },
        });

        expect(setPostData).toHaveBeenCalledWith(expect.any(Function));
        // Verify the updater function
        const updater = setPostData.mock.calls[0][0];
        const result = updater(basePostData);
        expect(result.slug).toBe('new-slug');
    });

    it('calls onClose when Escape key is pressed', () => {
        const onClose = vi.fn();
        render(
            <PostSettingsSidebar
                postData={basePostData}
                setPostData={() => {}}
                onClose={onClose}
            />
        );

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
        const onClose = vi.fn();
        const { container } = render(
            <PostSettingsSidebar
                postData={basePostData}
                setPostData={() => {}}
                onClose={onClose}
            />
        );

        fireEvent.click(container.querySelector('.koenig-sidebar-overlay'));

        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <PostSettingsSidebar
                postData={basePostData}
                setPostData={() => {}}
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByTitle('Close'));

        expect(onClose).toHaveBeenCalled();
    });
});
