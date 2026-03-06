import { defineConfig, Plugin } from 'vite';

function noModuleScript(): Plugin {
  return {
    name: 'no-module-script',
    transformIndexHtml(html) {
      return html.replace(
        /<script type="module" crossorigin src=/g,
        '<script defer src='
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [noModuleScript()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        assetFileNames: '[name][extname]',
        format: 'iife',
      },
    },
  },
});
