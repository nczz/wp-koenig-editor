import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'koenig-lexical-styles';
import './editor-styles.css';

const rootEl = document.getElementById('koenig-editor-root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<App />);
}
