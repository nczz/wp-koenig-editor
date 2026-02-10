import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostStatusBar from '@/components/PostStatusBar.jsx';

const baseProps = {
    postData: { status: 'draft' },
    saveStatus: 'idle',
    onSave: vi.fn(),
    onPublish: vi.fn(),
    onToggleSidebar: vi.fn(),
    backUrl: '/wp-admin/edit.php',
    wordCount: null,
};

describe('PostStatusBar', () => {
    it('shows "Save Draft" and "Publish" for draft status', () => {
        render(<PostStatusBar {...baseProps} />);

        expect(screen.getByText('Save Draft')).toBeInTheDocument();
        expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    it('shows "Save" and "Update" for publish status', () => {
        render(
            <PostStatusBar
                {...baseProps}
                postData={{ status: 'publish' }}
            />
        );

        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('shows "Saving..." and disables buttons when saving', () => {
        render(<PostStatusBar {...baseProps} saveStatus="saving" />);

        const savingButtons = screen.getAllByText('Saving...');
        expect(savingButtons.length).toBeGreaterThan(0);

        const saveBtn = screen.getByText('Saving...', { selector: 'button.koenig-btn--secondary' });
        expect(saveBtn).toBeDisabled();
    });

    it('calls onSave when Save button is clicked', () => {
        const onSave = vi.fn();
        render(<PostStatusBar {...baseProps} onSave={onSave} />);

        fireEvent.click(screen.getByText('Save Draft'));
        expect(onSave).toHaveBeenCalled();
    });

    it('calls onPublish when Publish button is clicked', () => {
        const onPublish = vi.fn();
        render(<PostStatusBar {...baseProps} onPublish={onPublish} />);

        fireEvent.click(screen.getByText('Publish'));
        expect(onPublish).toHaveBeenCalled();
    });

    it('displays word count when provided', () => {
        render(<PostStatusBar {...baseProps} wordCount={5} />);

        expect(screen.getByText('5 words')).toBeInTheDocument();
    });

    it('does not render word count when null', () => {
        render(<PostStatusBar {...baseProps} wordCount={null} />);

        expect(screen.queryByText(/words?/)).not.toBeInTheDocument();
    });

    // --- Behavioral tests: user-facing correctness ---

    it('shows "1 word" (singular) not "1 words"', () => {
        render(<PostStatusBar {...baseProps} wordCount={1} />);

        expect(screen.getByText('1 word')).toBeInTheDocument();
        expect(screen.queryByText('1 words')).not.toBeInTheDocument();
    });

    it('shows "0 words" for empty post', () => {
        render(<PostStatusBar {...baseProps} wordCount={0} />);

        expect(screen.getByText('0 words')).toBeInTheDocument();
    });

    it('disables Publish button too when saving', () => {
        // User clicks Save, then tries to click Publish.
        // Both should be disabled to prevent double-submit.
        render(<PostStatusBar {...baseProps} saveStatus="saving" />);

        const publishBtn = screen.getByText('Publish');
        expect(publishBtn).toBeDisabled();
    });

    it('shows "Save failed" status text on error', () => {
        render(<PostStatusBar {...baseProps} saveStatus="error" />);

        expect(screen.getByText('Save failed')).toBeInTheDocument();
    });

    it('shows "Saved" status text after successful save', () => {
        render(<PostStatusBar {...baseProps} saveStatus="saved" />);

        expect(screen.getByText('Saved')).toBeInTheDocument();
    });
});
