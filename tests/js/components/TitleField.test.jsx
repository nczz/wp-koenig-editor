import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TitleField from '@/components/TitleField.jsx';

describe('TitleField', () => {
    it('renders textarea with value and placeholder', () => {
        render(<TitleField value="My Title" onChange={() => {}} />);

        const textarea = screen.getByPlaceholderText('Post title');
        expect(textarea).toBeInTheDocument();
        expect(textarea.value).toBe('My Title');
    });

    it('calls onChange when user types', () => {
        const onChange = vi.fn();
        render(<TitleField value="" onChange={onChange} />);

        const textarea = screen.getByPlaceholderText('Post title');
        fireEvent.change(textarea, { target: { value: 'New Title' } });

        expect(onChange).toHaveBeenCalledWith('New Title');
    });

    it('calls onEnter when Enter is pressed', () => {
        const onEnter = vi.fn();
        render(<TitleField value="Title" onChange={() => {}} onEnter={onEnter} />);

        const textarea = screen.getByPlaceholderText('Post title');
        fireEvent.keyDown(textarea, { key: 'Enter' });

        expect(onEnter).toHaveBeenCalled();
    });

    it('calls onEnter when ArrowDown is pressed', () => {
        const onEnter = vi.fn();
        render(<TitleField value="Title" onChange={() => {}} onEnter={onEnter} />);

        const textarea = screen.getByPlaceholderText('Post title');
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });

        expect(onEnter).toHaveBeenCalled();
    });
});
