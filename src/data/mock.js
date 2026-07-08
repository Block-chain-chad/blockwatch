// Remaining mock data. Live token prices come from CoinGecko, folders live in
// FoldersContext (localStorage); these features get real backends in later
// steps: waitlist → step 5 (Supabase), alerts/news → step 6, detail chart → step 7.

// Curated headlines (manual feed for MVP — RSS later). Real timestamps so they
// sort correctly against live alert events.
const hoursAgo = (h) => Date.now() - h * 3_600_000

export const newsFeed = [
  {
    id: 'n2',
    kind: 'headline',
    source: 'CoinDesk',
    title: 'Nasdaq confirms H1 2027 launch window for its tokenized equities platform',
    at: hoursAgo(2),
  },
  {
    id: 'n4',
    kind: 'headline',
    source: 'The Block',
    title: 'xStocks monthly volume tops $2B as tokenized equities gain steam',
    at: hoursAgo(6),
  },
  {
    id: 'n5',
    kind: 'headline',
    source: 'Reuters',
    title: 'Ondo expands tokenized treasury products to two more chains',
    at: hoursAgo(26),
  },
  {
    id: 'n6',
    kind: 'headline',
    source: 'Bloomberg',
    title: 'SEC signals openness to a tokenized securities sandbox for exchanges',
    at: hoursAgo(49),
  },
]

export const popularSearches = ['NVDA', 'TSLA', 'SPY', 'AAPL', 'COIN']

export const recentlyTokenized = [
  { ticker: 'PLTR', name: 'Palantir', issuer: 'xStocks', chain: 'Solana' },
  { ticker: 'AMD', name: 'AMD', issuer: 'xStocks', chain: 'Solana' },
  { ticker: 'HOOD', name: 'Robinhood', issuer: 'xStocks', chain: 'Solana' },
]

