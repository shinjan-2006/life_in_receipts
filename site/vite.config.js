import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`         -> normal multi-file build in dist/ (deploy to Vercel / Netlify / GitHub Pages)
// `npm run build:single`  -> one self-contained HTML file in dist-single/
const single = !!process.env.SINGLE
export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: {
    assetsInlineLimit: single ? 100000000 : 4096,
    chunkSizeWarningLimit: 6000,
  },
})
