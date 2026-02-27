import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // root: path.resolve(__dirname, 'src/client'),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/client/js/main.ts'),
        desk: path.resolve(__dirname, 'src/client/desk.ts'),
        user: path.resolve(__dirname, 'src/client/js/user.ts'),
      },
    },
  },
  server: {
    middlewareMode: true,
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: [path.resolve(__dirname, 'node_modules')],
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      'bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    },
  },
});
