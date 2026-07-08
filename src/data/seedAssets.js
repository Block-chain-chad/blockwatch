// Seed asset universe: static mapping of CoinGecko token id → identity + underlying ticker.
// `id` is the CoinGecko coin id used in API calls. `underlying` is the real-world
// ticker for the stock-price feed (step 3); null = NAV-based product with no
// directly comparable listed ticker (no premium/discount shown).
// Extend by appending entries — nothing else needs to change.

const XSTOCKS_VENUES = ['Kraken', 'Bybit', 'Jupiter']
const ONDO_GM_VENUES = ['Ondo Global Markets']

const xstock = (id, ticker, name, underlying, type = 'stock') => ({
  id,
  ticker,
  name,
  underlying,
  type,
  issuer: 'xStocks',
  chain: 'Solana',
  venues: XSTOCKS_VENUES,
})

const ondo = (id, ticker, name, underlying, type = 'stock', venues = ONDO_GM_VENUES) => ({
  id,
  ticker,
  name,
  underlying,
  type,
  issuer: 'Ondo',
  chain: 'Ethereum',
  venues,
})

export const SEED_ASSETS = [
  // xStocks — equities
  xstock('nvidia-xstock', 'NVDAx', 'NVIDIA', 'NVDA'),
  xstock('tesla-xstock', 'TSLAx', 'Tesla', 'TSLA'),
  xstock('apple-xstock', 'AAPLx', 'Apple', 'AAPL'),
  xstock('microsoft-xstock', 'MSFTx', 'Microsoft', 'MSFT'),
  xstock('alphabet-xstock', 'GOOGLx', 'Alphabet', 'GOOGL'),
  xstock('amazon-xstock', 'AMZNx', 'Amazon', 'AMZN'),
  xstock('meta-xstock', 'METAx', 'Meta Platforms', 'META'),
  xstock('coinbase-xstock', 'COINx', 'Coinbase', 'COIN'),
  xstock('circle-xstock', 'CRCLx', 'Circle', 'CRCL'),
  xstock('microstrategy-xstock', 'MSTRx', 'Strategy', 'MSTR'),
  xstock('robinhood-xstock', 'HOODx', 'Robinhood', 'HOOD'),
  xstock('amd-xstock', 'AMDx', 'AMD', 'AMD'),
  xstock('palantir-xstock', 'PLTRx', 'Palantir', 'PLTR'),
  xstock('oracle-xstock', 'ORCLx', 'Oracle', 'ORCL'),
  xstock('broadcom-xstock', 'AVGOx', 'Broadcom', 'AVGO'),
  xstock('berkshire-hathaway-xstock', 'BRK.Bx', 'Berkshire Hathaway', 'BRK.B'),
  xstock('mcdonald-s-xstock', 'MCDx', "McDonald's", 'MCD'),
  xstock('netflix-xstock', 'NFLXx', 'Netflix', 'NFLX'),
  xstock('exxon-mobil-xstock', 'XOMx', 'Exxon Mobil', 'XOM'),
  xstock('intel-xstock', 'INTCx', 'Intel', 'INTC'),
  // xStocks — ETFs
  xstock('sp500-xstock', 'SPYx', 'S&P 500 ETF', 'SPY', 'etf'),
  xstock('nasdaq-xstock', 'QQQx', 'Nasdaq 100 ETF', 'QQQ', 'etf'),
  xstock('gold-xstock', 'GLDx', 'Gold Trust ETF', 'GLD', 'etf'),
  xstock('tqqq-xstock', 'TQQQx', 'ProShares UltraPro QQQ', 'TQQQ', 'etf'),
  // Ondo Global Markets — equities & ETFs
  ondo('nvidia-ondo-tokenized-stock', 'NVDAon', 'NVIDIA', 'NVDA'),
  ondo('tesla-ondo-tokenized-stock', 'TSLAon', 'Tesla', 'TSLA'),
  ondo('spdr-s-p-500-etf-ondo-tokenized-etf', 'SPYon', 'SPDR S&P 500 ETF', 'SPY', 'etf'),
  ondo('invesco-qqq-etf-ondo-tokenized-etf', 'QQQon', 'Invesco QQQ ETF', 'QQQ', 'etf'),
  // Bonds / treasuries
  ondo('ishares-20-year-treasury-bond-etf-ondo-tokenized-etf', 'TLTon', 'iShares 20+ Yr Treasury ETF', 'TLT', 'bond'),
  ondo('ousg', 'OUSG', 'Ondo Short-Term US Treasuries', null, 'bond', ['Ondo Finance']),
  ondo('ondo-us-dollar-yield', 'USDY', 'Ondo US Dollar Yield', null, 'bond', ['Ondo Finance']),
]

export const SEED_IDS = SEED_ASSETS.map((a) => a.id)

// Unique real-world tickers for the stock price feed (nulls = NAV-based, skipped).
export const UNDERLYING_TICKERS = [
  ...new Set(SEED_ASSETS.map((a) => a.underlying).filter(Boolean)),
]
