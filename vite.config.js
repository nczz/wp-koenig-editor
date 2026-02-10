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
        },
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});
