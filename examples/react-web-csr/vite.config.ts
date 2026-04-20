import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      'react-native': resolve(__dirname, 'src/__mocks__/react-native.ts'),
      '@react-native': resolve(__dirname, 'src/__mocks__/react-native.ts'),
    },
    mainFields: ['module', 'main', 'types'],
  },
  optimizeDeps: {
    // Workspace packages must NOT be prebundled — prebundling inlines a private
    // copy of @supramark/core, which desyncs `customContainerHooks` between
    // Supramark (prebundled) and the feature packages (loaded from source).
    // See: https://vitejs.dev/guide/dep-pre-bundling.html
    exclude: [
      'react-native',
      '@react-native',
      '@react-native/virtualized-lists',
      '@supramark/core',
      '@supramark/web',
      '@supramark/web/client',
      '@supramark/web/server',
      '@supramark/engines',
      '@supramark/engines/web',
    ],
  },
});
