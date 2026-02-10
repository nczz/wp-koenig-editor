import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

function BrokenChild() {
    throw new Error('Component exploded');
}

describe('ErrorBoundary', () => {
    // Suppress React error boundary console output during tests
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('renders children normally', () => {
        render(
            <ErrorBoundary>
                <div>All good</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('All good')).toBeInTheDocument();
    });

    it('shows error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <BrokenChild />
            </ErrorBoundary>
        );

        expect(screen.getByText('Editor Error')).toBeInTheDocument();
    });

    it('displays the error message in pre element', () => {
        render(
            <ErrorBoundary>
                <BrokenChild />
            </ErrorBoundary>
        );

        expect(screen.getByText('Component exploded')).toBeInTheDocument();
    });
});
