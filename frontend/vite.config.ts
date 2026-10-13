import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mirrors the rewrites in vercel.json, so the browser talks to one origin in dev exactly
// as it does in production and the session cookie is first-party in both. changeOrigin
// makes Django see its own Host while Origin stays the frontend's -- the same mismatch
// Vercel produces, so a CSRF_TRUSTED_ORIGINS mistake shows up here and not in production.
const BACKEND = 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/(api|admin|static)(/|$)': { target: BACKEND, changeOrigin: true },
    },
  },
})
