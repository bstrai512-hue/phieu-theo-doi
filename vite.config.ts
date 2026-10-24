import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { codeInspectorPlugin } from 'code-inspector-plugin';

export default defineConfig({
  server: { port: 5512 },
  plugins: [
    codeInspectorPlugin({ bundler: 'vite' }),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') } },
});
