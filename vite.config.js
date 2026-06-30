import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// CSS minification is intentionally disabled.
// Vercel's build runner hits a lightningcss minify crash
// ("Unexpected end of input") that does not occur locally.
// Disabling minify removes lightningcss from the build path.
// Gzipped CSS size impact is negligible (~0.2 kB).
export default defineConfig({
  // Relative base so built asset paths work both on the web (Vercel)
  // and inside the packaged Electron desktop app (loaded from a local file).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    cssMinify: false,
  },
})