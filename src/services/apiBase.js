// Where the /api serverless functions live. Empty on the website itself
// (same-origin relative paths); native app builds (Capacitor) aren't served
// from Vercel, so they set VITE_API_BASE to the deployed site's absolute URL
// at build time.
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
