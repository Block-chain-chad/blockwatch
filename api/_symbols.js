// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/build-symbols.mjs
//
// Every stock symbol the app can display: the distinct non-null "underlying"
// values in src/data/universe.json. api/finnhub.js forwards nothing else.
//
// Why this list exists. The proxy used to accept any 1-10 character symbol,
// and every distinct symbol is a distinct edge-cache key, so a script walking
// ?symbol=AAAA..ZZZZ turned one shared cached response into unlimited upstream
// calls against Finnhub's shared 60/min free tier. A drained quota blanks the
// share price — and therefore the gap — for every user at once. Bounding the
// symbol space bounds the cache-key space, which bounds the upstream spend.
//
// Matching is EXACT, not case-insensitive. The client only ever sends the
// uppercase form straight out of universe.json, and accepting "aapl" beside
// "AAPL" would hand the drain straight back: case variants are different URLs,
// so they are different cache keys, and each one costs its own upstream call.

export const ALLOWED_SYMBOLS = new Set([
  "AAL", "AAOI", "AAON", "AAPL", "ABBV", "ABNB", "ABT", "ACHR",
  "ACLS", "ACMR", "ACN", "ADBE", "ADI", "AEHR", "AG", "AGG",
  "AIP", "AIQ", "ALAB", "ALB", "ALOY", "AMAT", "AMBR", "AMC",
  "AMD", "AME", "AMGN", "AMKR", "AMZN", "ANET", "AOSL", "APH",
  "APLD", "APO", "APP", "ARGT", "ARM", "ARQQ", "ASML", "ASTS",
  "ATKR", "AUR", "AVGO", "AXP", "AXTI", "AZN", "BA", "BABA",
  "BAC", "BAI", "BBAI", "BE", "BIDU", "BIL", "BILI", "BINC",
  "BKCH", "BLCR", "BLK", "BLSH", "BMNR", "BNO", "BOT", "BOTZ",
  "BRHY", "BRK.B", "BRLN", "BRTR", "BSP", "BTDR", "BTG", "BTGO",
  "BWET", "BZ", "C", "CAMT", "CAPR", "CAT", "CBRS", "CCJ",
  "CEG", "CEVA", "CIBR", "CIEN", "CIFR", "CLF", "CLOA", "CLOI",
  "CLS", "CLSK", "CMCSA", "CMG", "COF", "COHR", "COHU", "COIN",
  "COP", "COPX", "CORO", "CORZ", "COST", "CPER", "CPNG", "CRCL",
  "CRDO", "CRM", "CRWD", "CRWV", "CSCO", "CVNA", "CVX", "DASH",
  "DBC", "DE", "DELL", "DFDV", "DGRW", "DGXX", "DHR", "DIS",
  "DNN", "DRAM", "DRS", "DTCR", "DYNF", "ECH", "ECO", "EEM",
  "EFA", "EFV", "EMR", "ENB", "ENLV", "ENPH", "ENTG", "EQIX",
  "EQT", "ETHA", "ETN", "EUHY", "EWJ", "EWY", "EWZ", "EXOD",
  "EXTR", "F", "FCEL", "FCX", "FFOG", "FGDL", "FIG", "FIGR",
  "FLEX", "FLHY", "FLNC", "FLQL", "FN", "FORM", "FPS", "FSOL",
  "FTGC", "FUTU", "FXI", "GD", "GE", "GEMI", "GEV", "GFS",
  "GGOV", "GLD", "GLTR", "GLW", "GLXY", "GME", "GNRC", "GOOGL",
  "GRAB", "GRND", "GS", "HAL", "HD", "HII", "HIMS", "HIMX",
  "HIVE", "HLIT", "HON", "HOOD", "HPE", "HSAI", "HUBB", "HUT",
  "HYG", "HYS", "IALT", "IAU", "IBIT", "IBM", "ICHR", "IDEF",
  "IEF", "IEFA", "IEI", "IEMG", "IGEB", "IGV", "IJH", "IJS",
  "INCE", "INDA", "INOD", "INRO", "INSW", "INTC", "INTU", "IONQ",
  "IRDM", "IREN", "ISRG", "ITA", "ITOT", "IVV", "IWF", "IWM",
  "IWN", "IYW", "JAAA", "JBL", "JD", "JNJ", "JPM", "KEEL",
  "KEYS", "KLAC", "KO", "KOPN", "KRAQ", "KWEB", "LASR", "LECO",
  "LEMB", "LI", "LIN", "LIT", "LITE", "LLY", "LMT", "LOW",
  "LPTH", "LRCX", "LSCC", "LUNR", "LWLG", "MA", "MARA", "MBLY",
  "MCD", "MDT", "MEI", "MELI", "META", "MKSI", "MOO", "MP",
  "MRK", "MRNA", "MRVL", "MSFT", "MSTR", "MTSI", "MTZ", "MU",
  "MXL", "MYRG", "NAT", "NBIS", "NEE", "NEM", "NET", "NFLX",
  "NIKL", "NIO", "NKE", "NNE", "NOC", "NOK", "NOW", "NTES",
  "NUE", "NVDA", "NVMI", "NVO", "NVT", "NVTS", "OIH", "OII",
  "OKLO", "ON", "ONDS", "ONTO", "OPEN", "OPRA", "ORBX", "ORCL",
  "OSCR", "OUST", "OXY", "PALL", "PANW", "PAVE", "PBR", "PCG",
  "PDBC", "PDD", "PENG", "PEP", "PFE", "PG", "PINS", "PL",
  "PLTR", "PLUG", "PM", "POWI", "POWL", "PPLT", "PRIM", "PSQ",
  "PURR", "PWR", "PYPL", "QBTS", "QCOM", "QLTA", "QQQ", "QTUM",
  "QUBT", "QYLD", "RBLX", "RDDT", "RDW", "REGN", "REMX", "RGTI",
  "RIOT", "RIVN", "RKLB", "RMBS", "ROK", "RTX", "SAP", "SATA",
  "SBET", "SBUX", "SCCO", "SCHF", "SCHW", "SEDG", "SGOV", "SHLD",
  "SHOP", "SHY", "SIL", "SKHY", "SLB", "SLV", "SMCI", "SMR",
  "SNAP", "SNDK", "SNOW", "SO", "SOFI", "SOUN", "SOXL", "SOXQ",
  "SOXS", "SOXX", "SPCE", "SPGI", "SPOT", "SPY", "SQQQ", "STLD",
  "STM", "STNG", "STRC", "STX", "SWKS", "SYM", "T", "TASK",
  "TBLL", "TCOM", "TEL", "TEN", "TER", "TIP", "TLN", "TLT",
  "TM", "TMO", "TMUS", "TNK", "TONX", "TQQQ", "TSEM", "TSLA",
  "TSM", "TT", "TTMI", "TXN", "UAMY", "UBER", "UCTT", "UEC",
  "UMC", "UNG", "UNH", "UNP", "URA", "URNM", "USAR", "USFR",
  "USO", "UUUU", "V", "VCX", "VDE", "VFS", "VICR", "VNQ",
  "VPG", "VRSN", "VRT", "VRTX", "VSH", "VST", "VT", "VTI",
  "VTV", "VZ", "WBD", "WCC", "WDC", "WFC", "WLK", "WM",
  "WMB", "WMT", "WOLF", "WS", "WULF", "WYFI", "XLE", "XOM",
  "XYLD", "XYZ", "YEAR",
])

/** True when this is a symbol the app itself would ask for. */
export function isAllowedSymbol(symbol) {
  return typeof symbol === 'string' && ALLOWED_SYMBOLS.has(symbol)
}
