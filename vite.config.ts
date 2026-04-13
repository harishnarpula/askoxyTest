import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const coiHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: coiHeaders,
    proxy: {
      '/wc-proxy/staticblitz': {
        target: 'https://t.staticblitz.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/wc-proxy\/staticblitz/, ''),
        headers: coiHeaders,
      },
      '/wc-proxy/wasm': {
        target: 'https://w-corp-staticblitz.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/wc-proxy\/wasm/, ''),
        headers: coiHeaders,
      },
    },
  },
  preview: {
    headers: coiHeaders,
  },
})
