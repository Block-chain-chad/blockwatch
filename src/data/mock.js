// Remaining mock data. Live token prices come from CoinGecko, folders live in
// FoldersContext (localStorage); these features get real backends in later
// steps: waitlist → step 5 (Supabase), alerts/news → step 6, detail chart → step 7.

// Placeholder headlines for development builds only (News.jsx drops them from
// production). Obviously fake on purpose: a made-up headline credited to a
// real outlet or regulator should not exist anywhere in the codebase.
const hoursAgo = (h) => Date.now() - h * 3_600_000

export const newsFeed = [
  {
    id: 'n2',
    kind: 'headline',
    source: 'Example source',
    title: 'Example headline one (development only)',
    at: hoursAgo(2),
  },
  {
    id: 'n4',
    kind: 'headline',
    source: 'Example source',
    title: 'Example headline two (development only)',
    at: hoursAgo(6),
  },
  {
    id: 'n5',
    kind: 'headline',
    source: 'Example source',
    title: 'Example headline three (development only)',
    at: hoursAgo(26),
  },
  {
    id: 'n6',
    kind: 'headline',
    source: 'Example source',
    title: 'Example headline four (development only)',
    at: hoursAgo(49),
  },
]

export const popularSearches = ['NVDA', 'TSLA', 'SPY', 'AAPL', 'COIN']

