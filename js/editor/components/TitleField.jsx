import React, { useCallback, useRef, useEffect } from 'react';

export default function TitleField({ value, onChange, onEnter }) {
    const textareaRef = useRef(null);

    // Auto-resize textarea to fit content.
    const adjustHeight = useCallback(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            onEnter?.();
        }
    }, [onEnter]);

    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <textarea
            ref={textareaRef}
            className="koenig-title-field"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Post title"
            rows={1}
        />
    );
}
