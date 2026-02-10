import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaxonomySelector from '@/components/TaxonomySelector.jsx';

vi.mock('@/utils/api.js', () => ({
    apiFetch: vi.fn(),
}));

import { apiFetch } from '@/utils/api.js';

describe('TaxonomySelector', () => {
    beforeEach(() => {
        apiFetch.mockReset();
    });

    it('shows "Loading..." initially', () => {
        apiFetch.mockReturnValue(new Promise(() => {})); // never resolves

        render(
            <TaxonomySelector taxonomy="categories" selected={[]} onChange={() => {}} />
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders checkboxes for each term after loading', async () => {
        apiFetch.mockResolvedValue([
            { id: 1, name: 'Tech' },
            { id: 2, name: 'News' },
        ]);

        render(
            <TaxonomySelector taxonomy="categories" selected={[1]} onChange={() => {}} />
        );

        await waitFor(() => {
            expect(screen.getByText('Tech')).toBeInTheDocument();
        });

        expect(screen.getByText('News')).toBeInTheDocument();

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0]).toBeChecked(); // Tech is selected
        expect(checkboxes[1]).not.toBeChecked();
    });

    it('toggles checkbox and calls onChange', async () => {
        apiFetch.mockResolvedValue([
            { id: 1, name: 'Tech' },
            { id: 2, name: 'News' },
        ]);

        const onChange = vi.fn();
        render(
            <TaxonomySelector taxonomy="categories" selected={[1]} onChange={onChange} />
        );

        await waitFor(() => {
            expect(screen.getByText('News')).toBeInTheDocument();
        });

        // Check News
        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        expect(onChange).toHaveBeenCalledWith([1, 2]);
    });

    it('creates new term on Enter', async () => {
        apiFetch
            .mockResolvedValueOnce([{ id: 1, name: 'Tech' }]) // initial load
            .mockResolvedValueOnce({ id: 3, name: 'Science' }); // create

        const onChange = vi.fn();
        render(
            <TaxonomySelector taxonomy="categories" selected={[1]} onChange={onChange} />
        );

        await waitFor(() => {
            expect(screen.getByText('Tech')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Add new category...');
        fireEvent.change(input, { target: { value: 'Science' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith([1, 3]);
        });

        // Verify POST was made
        expect(apiFetch).toHaveBeenCalledWith('wp/v2/categories', {
            method: 'POST',
            body: JSON.stringify({ name: 'Science' }),
        });
    });

    it('decodes HTML entities in term names', async () => {
        apiFetch.mockResolvedValue([
            { id: 1, name: 'Arts &amp; Culture' },
        ]);

        render(
            <TaxonomySelector taxonomy="categories" selected={[]} onChange={() => {}} />
        );

        await waitFor(() => {
            expect(screen.getByText('Arts & Culture')).toBeInTheDocument();
        });
    });

    // --- Behavioral tests: user interaction correctness ---

    it('unchecking a selected term removes it from the list', async () => {
        // User has [Tech, News] selected, unchecks Tech.
        // Result should be [News] only, not empty or [Tech, News].
        apiFetch.mockResolvedValue([
            { id: 1, name: 'Tech' },
            { id: 2, name: 'News' },
        ]);

        const onChange = vi.fn();
        render(
            <TaxonomySelector taxonomy="categories" selected={[1, 2]} onChange={onChange} />
        );

        await waitFor(() => {
            expect(screen.getByText('Tech')).toBeInTheDocument();
        });

        // Uncheck Tech (first checkbox)
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(onChange).toHaveBeenCalledWith([2]);
    });

    it('does not create term when input is only whitespace', async () => {
        apiFetch.mockResolvedValueOnce([{ id: 1, name: 'Tech' }]);

        render(
            <TaxonomySelector taxonomy="categories" selected={[]} onChange={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Tech')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Add new category...');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        // Should NOT have made a second API call to create a term
        expect(apiFetch).toHaveBeenCalledTimes(1); // only the initial load
    });

    it('uses correct endpoint for tags taxonomy', async () => {
        apiFetch.mockResolvedValue([{ id: 5, name: 'JavaScript' }]);

        render(
            <TaxonomySelector taxonomy="tags" selected={[]} onChange={() => {}} />
        );

        await waitFor(() => {
            expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        // Should call wp/v2/tags, not wp/v2/categories
        expect(apiFetch.mock.calls[0][0]).toContain('wp/v2/tags');
    });

    it('shows correct placeholder for tags', async () => {
        apiFetch.mockResolvedValue([]);

        render(
            <TaxonomySelector taxonomy="tags" selected={[]} onChange={() => {}} />
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Add new tag...')).toBeInTheDocument();
        });
    });

    it('does not crash when API returns error during load', async () => {
        apiFetch.mockRejectedValue(new Error('Network error'));

        render(
            <TaxonomySelector taxonomy="categories" selected={[]} onChange={() => {}} />
        );

        // Should stop showing Loading... even on error, and not crash
        await waitFor(() => {
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
    });
});
