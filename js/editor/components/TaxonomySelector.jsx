import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Decode HTML entities from WP REST API responses.
 * Uses DOMParser for safe decoding without innerHTML on live DOM elements.
 */
function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return str;
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.body.textContent || '';
}

export default function TaxonomySelector({ taxonomy, selected, onChange }) {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTerm, setNewTerm] = useState('');

    const endpoint = taxonomy === 'categories' ? 'wp/v2/categories' : 'wp/v2/tags';

    useEffect(() => {
        apiFetch(`${endpoint}?per_page=100`)
            .then((data) => {
                setTerms(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [endpoint]);

    const toggleTerm = useCallback((termId) => {
        const newSelected = selected.includes(termId)
            ? selected.filter((id) => id !== termId)
            : [...selected, termId];
        onChange(newSelected);
    }, [selected, onChange]);

    const addNewTerm = useCallback(async () => {
        if (!newTerm.trim()) return;

        try {
            const created = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ name: newTerm.trim() }),
            });
            setTerms((prev) => [...prev, created]);
            onChange([...selected, created.id]);
            setNewTerm('');
        } catch {
            // Term might already exist.
        }
    }, [newTerm, endpoint, selected, onChange]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewTerm();
        }
    }, [addNewTerm]);

    if (loading) {
        return <span className="koenig-sidebar__loading">Loading...</span>;
    }

    return (
        <div className="koenig-taxonomy-selector">
            <div className="koenig-taxonomy-selector__list">
                {terms.map((term) => (
                    <label key={term.id} className="koenig-taxonomy-selector__item">
                        <input
                            type="checkbox"
                            checked={selected.includes(term.id)}
                            onChange={() => toggleTerm(term.id)}
                        />
                        <span>{decodeHtmlEntities(term.name)}</span>
                    </label>
                ))}
            </div>
            <div className="koenig-taxonomy-selector__add">
                <input
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Add new ${taxonomy === 'categories' ? 'category' : 'tag'}...`}
                />
            </div>
        </div>
    );
}
