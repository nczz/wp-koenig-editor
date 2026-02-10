import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: path.resolve(__dirname, 'assets/js'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'js/editor/index.jsx'),
            output: {
                format: 'iife',
                name: 'WPKoenigEditor',
                entryFileNames: 'koenig-editor.js',
                assetFileNames: 'koenig-editor.[ext]',
                // Bundle everything into a single chunk.
                manualChunks: undefined,
            },
        },
        // Inline small assets to reduce HTTP requests.
        assetsInlineLimit: 8192,
        sourcemap: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'js/editor'),
            // Koenig's package.json exports don't include CSS, alias to the file directly.
            'koenig-lexical-styles': path.resolve(__dirname, 'node_modules/@tryghost/koenig-lexical/dist/index.css'),
        },
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
});
