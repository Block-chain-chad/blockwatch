import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Honor an externally assigned port (e.g. Claude Code's preview pane sets
    // PORT so parallel sessions don't fight over 5173); default otherwise.
    port: Number(process.env.PORT) || 5173,
    proxy: {
      // Dev-only stock-quote fallback: Yahoo's public endpoint has no CORS
      // headers, so the dev server relays it. Production uses Finnhub (key in
      // .env.local) or the edge proxy from a later step. See services/stocks.js.
      '/yfin': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/yfin/, ''),
      },
    },
  },
})
