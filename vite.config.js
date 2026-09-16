import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vercel sets VERCEL_ENV ("production" | "preview" | "development") on every
// build, but only VITE_-prefixed variables are exposed to the browser. Copy it
// across before Vite reads the environment, so Sentry and PostHog can say
// which deployment an event came from without anyone configuring a second
// variable by hand. A VITE_VERCEL_ENV set explicitly in the dashboard wins.
// See src/lib/environment.js.
if (!process.env.VITE_VERCEL_ENV && process.env.VERCEL_ENV) {
  process.env.VITE_VERCEL_ENV = process.env.VERCEL_ENV
}

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
      // Dev-only relay for Google News RSS (headlines; no CORS upstream).
      // Production uses /api/news instead.
      '/gnews': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gnews/, ''),
      },
      // FRED sends no CORS headers, and there is no serverless function under
      // vite dev, so the yield curve comes through here in development.
      '/fred': {
        target: 'https://fred.stlouisfed.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/fred/, ''),
      },
      // GeckoTerminal (token candles). It does send CORS headers, but going
      // through the dev server keeps the client code one code path away from
      // production, where /api/candles fronts it. See services/candles.js.
      '/gt': {
        target: 'https://api.geckoterminal.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gt/, ''),
      },
    },
  },
})
