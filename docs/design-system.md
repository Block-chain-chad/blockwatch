# BlockWatch Design System

Written before implementation. Grounded in teardowns of rwa.xyz, DefiLlama and
TradingView (source-level: their shipped CSS, their formatter source, their
published theme tokens), plus a measured audit of the current app.

Hard constraints: no purple gradients, no glassmorphism, no nested cards, no
emoji icons, no decorative animation, tabular figures, remove before adding.

---

## 0. The thesis

rwa.xyz lists a token's value and its underlying NAV as two separate columns and
**never computes the spread between them.** DefiLlama has 45 columns and no
opinion. TradingView promotes exactly one derived number to its own column —
`Pre-mkt gap %`, the discontinuity between two sessions of the same asset — and
it is the most useful thing on the page.

**The premium/discount is BlockWatch's entire product.** It is the one number
nobody else computes. Every layout decision below follows from making it the
most legible thing on screen, and from never letting it lie.

---

## 1. Surfaces — separation is border-led, not background-led

The measured lesson from DefiLlama: their four surfaces span only ~12 points of
L\*, but their hairlines resolve ~7 L\* above whatever they sit on. **The border
does roughly 2.8× the perceptual separating work the background step does.**
That is why their dark UI reads as structured rather than flat, with zero drop
shadows sitewide.

Two consequences we adopt:

1. **Borders are white at low alpha, not fixed hex.** One token composites
   correctly on every surface. This is what makes a single `border-subtle`
   usable everywhere.
2. **Borders replace both shadows and nested cards.** A hairline separates as
   well as a shadow does, so a card inside a card is never needed — a rule is.
   This satisfies two of the hard constraints by construction.

Every surface carries a slight cool cast (chroma ≠ 0). Pure neutral gray reads
as dead on a large dark field. Hue is held at 250 — cool, not blue-tinted enough
to look like a theme, and nowhere near purple.

```css
--surface-0: oklch(0.145 0.008 250);  /* page */
--surface-1: oklch(0.175 0.009 250);  /* rows, panels */
--surface-2: oklch(0.205 0.010 250);  /* sheets, popovers */
--surface-3: oklch(0.235 0.011 250);  /* hover, pressed */

--border-subtle:  rgb(255 255 255 / 0.06);   /* row dividers */
--border-default: rgb(255 255 255 / 0.10);   /* panel edges, inputs */
--border-strong:  rgb(255 255 255 / 0.16);   /* focus, active */
```

Four levels is the ceiling. If something needs a fifth, the layout is wrong.

**Banned:** `box-shadow` for elevation, backdrop blur, gradient fills on
surfaces. The existing `bw-aurora` glow layers are removed — on the Folders
screen they are currently the main visual event on an otherwise empty page.

---

## 2. Type — six steps, weight bound to role

The current app uses **ten distinct font sizes on the Home screen alone** (8, 10,
11, 12, 13, 14, 15, 18, 24, 36px). That is ten independent decisions, not a
scale.

DefiLlama's model is the fix: semantic ramps where size, weight and line-height
are locked together, so weight is a function of role and there is no knob to
fiddle with.

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `display` | 32px | 600 | 1.1 | −0.02em | Hero figures only. One per screen. |
| `title` | 20px | 600 | 1.2 | −0.01em | Screen titles, asset price header |
| `body` | 15px | 400 | 1.5 | 0 | Prose, explanatory copy |
| `label` | 13px | 500 | 1.3 | 0 | Row primary text, buttons, tickers |
| `caption` | 12px | 400 | 1.35 | 0 | Row secondary text, metadata |
| `micro` | 11px | 500 | 1.2 | 0.04em | Column headers only, uppercase |

Six steps. Anything not on this list does not ship.

**Typeface: keep the system stack.** A licensed webfont is an addition, and the
constraint is to remove. System UI faces on iOS and Windows both support
`tabular-nums`, which is the property that actually matters here.

**All numbers are tabular.** One utility class, applied to every figure:

```css
.num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
```

Currency symbols render in their own span so decimal points align across rows —
lifted from rwa.xyz, whose grid cells do exactly this.

---

## 3. Spacing — 4px base, and a fixed row

```
4 · 8 · 12 · 16 · 24 · 32 · 48
```

| Thing | Value |
|---|---|
| Row height (touch) | 56px |
| Row height (pointer, ≥1024px) | 44px |
| Cell padding | 12px vertical, 16px horizontal |
| Section gap | 24px |
| Screen gutter | 16px mobile, 24px desktop |
| Max content width | 1200px |
| Radius | 6px controls, 8px panels, 999px only for status pills |

**Rows are a fixed height and never reflow.** DefiLlama's 50px rows with 12px
padding are dense without feeling cramped precisely because the density comes
from small type in a generous box, not from squeezing the box. Two-line cells
absorb into the fixed height with negative margin rather than growing the row.

**Radius discipline.** The current Home screen has **19 fully-rounded pills** —
search field, filters, badges, tags all share one shape, so nothing can signal
rank. Going forward the pill is reserved exclusively for status (premium
badges, session state). Controls are 6px, panels 8px.

---

## 4. Gain / loss / premium

Three separate ideas that are currently tangled:

| Concept | Meaning | Where |
|---|---|---|
| **Price change** | asset vs its own prior close | sparkline, 24h change |
| **Premium/discount** | token vs its underlying stock | the product |
| **Session state** | is the stock market open | orthogonal to both |

TradingView's token set proves the model: they ship four session colors
(`pre`/`post`/`open`/`closed`) declared entirely separately from
`positive`/`negative`. **Session state and price direction are orthogonal color
axes and must never share a scale.**

```css
--gain: #3fb950;
--loss: #f85149;
--flat: var(--text-tertiary);

--session-open:      #3fb950;   /* stock market open */
--session-overnight: #d29922;   /* stock closed, token still trading */
--session-closed:    var(--text-tertiary);
```

Directional colors are deliberately off full chroma. TradingView uses `#26a69a`
/ `#ef5350` — Material 400-level, not pure — because saturated green/red
vibrates on dark during long sessions. rwa.xyz uses near-full-chroma
(`#00c950`) and it is the harshest of the three.

**Contrast target: ≥4.5:1 against `--surface-0` and `--surface-1`, verified
programmatically at token implementation, not assumed.**

### The sign rule

**The sign is always carried by the character. Color is reinforcement, never the
carrier.** Render `−2.14%` and `+2.14%` literally, always, in both directions.

This is not a style preference. rwa.xyz's metric tiles render a decline as
`▼ 10.74%` — **no minus sign** — so the sign survives only as color plus a
triangle glyph. In grayscale, in a screenshot, copy-pasted, or to a colorblind
user, a 10.74% loss reads as a gain. It is the single worst bug found across all
three teardowns and it is one line to avoid.

Use U+2212 MINUS, not hyphen-minus, so columns align (TradingView does this).

A colorblind-safe alternate pair ships as a token swap, not a rewrite —
following DefiLlama, who build `--text-data-up-alt` / `--down-alt` into their
palette. Ours uses blue/amber, never purple.

### Semantic collision to fix

Currently a row shows a green `+0.29%` premium badge beside a **red** sparkline,
20px apart. The sparkline tracks 7-day price; the badge tracks premium. Two
genuinely different facts in the same color language with no labels. Either
label them or desaturate the sparkline to a neutral stroke — it is trend
context, not a signal.

---

## 5. Numbers

Adopted largely verbatim from DefiLlama's formatter source, which is the most
carefully considered part of any site reviewed, **with one correction.**

| Rule | Behaviour |
|---|---|
| Decimals by magnitude | ≥ 1e9 → 3dp; below → 2dp |
| Sub-$1 prices | precision scales by `-log10`, capped at 10 — `$0.058`, not `$0.01` |
| Per-share prices | always 2dp regardless of magnitude |
| Compaction | opt-in above 1e3 only; lowercase suffix (`$75.7b`) |
| **Compaction is banned on percentages and prices** | prevents TradingView's `259.37 K%` |
| Percent change | 2dp; 0dp above ±100% |
| Positive sign | explicit `+`, always |
| Exact zero | literal `"0%"` — never `+0.00%` |
| Negative zero | normalised: `Object.is(x,-0) ? 0 : x` |
| Tiny non-zero | `<0.01%` / `>-0.0001%` — never a rounded, lying `0.00%` |
| **Missing data** | **`—` in `--text-tertiary`. Never `$0`, never `0.00%`.** |
| Grouping | comma separators; `$` in its own span |

**The correction:** DefiLlama renders null as `$0` — 119 times on one page — so
"no data" is indistinguishable from "measured zero". For us that is worse than a
cosmetic flaw: a failed underlying quote would render a **0.00% premium that
looks real**. Missing must look missing.

### Outlier suppression

The News digest currently publishes *"Biggest 24h move — WMKT −47.60%"*. That is
near-certainly a thin or broken token, presented in the same voice as everything
else. TradingView ships the identical class of bug (`−10,172.30 USD` EPS on
their gainers table). Any figure promoted to a headline slot must pass a
plausibility gate, and thin-market assets are excluded from superlatives.

### Freshness is a first-class fact

Neither TradingView nor rwa.xyz has any "last updated" treatment worth copying —
TradingView has none at all. But BlockWatch has a problem they don't: **the two
legs of the comparison have different ages.** The token leg can be seconds old
while the stock leg is hours old and closed. A premium computed across those is
a real number with a caveat, and the caveat has to be visible. Per-leg
timestamps, not one global "updated 5m ago".

---

## 6. Motion

Motion exists to explain a state change. Nothing animates to be pleasant.

| What | Duration | Easing |
|---|---|---|
| Hover / press feedback | 120ms | ease-out |
| Sheet / overlay enter | 200ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Sheet exit | 150ms | ease-in |
| Price digit change flash | 400ms | ease-out, background only |
| Chart draw-in, first mount only | 300ms | ease-out |

**Never animates:** page transitions, list reordering, number counting,
backgrounds, logos, anything on a loop.

**Removed from the current app:** the aurora glow layers, `moon-breathe`, the
hero settle, and CTA glow pulses. All are decorative and all are on the banned
list.

Everything above is suppressed entirely under `prefers-reduced-motion`.

---

## 7. Layout

### Mobile (390px)

The current Home screen puts the first price **536px down an 844px viewport —
63%**. Above it: header, search, hero figure, overnight banner, two stat cards,
filter pills, and a dismissible explainer. Total non-data chrome (630px) exceeds
total data (615px).

Target: **first price above 240px.** That means the hero figure, the stat cards
and the permanent explainer come out of the scroll flow.

### Desktop (≥1024px)

Currently the app renders as a ~290–446px column in a 1440px window with ~80% of
the screen black, and dead space below the tab bar. It does not acknowledge
desktop exists.

Desktop is where the product's core comparison finally fits on one line. The
layout becomes a real table:

```
TICKER    NAME          TOKEN      STOCK      PREMIUM    7D        CHAIN
NVDAx     NVIDIA       $208.19    $206.84     +0.65%    ▁▃▅▇      SOL
```

Sticky ticker column, sticky header (DefiLlama gets this wrong — their header
scrolls away), fixed row height, `min(Npx, 40vw)` column widths so no column can
eat a phone screen. Max 1200px, centred.

**Premium is the widest, boldest column after the ticker.** It is the reason the
table exists.

---

## 8. What this removes

Consistent with "prefer removing over adding":

- The permanent explainer card on Home (move into the column header)
- The two stat cards (Watching / Avg premium — neither drives a decision)
- The hero "Tokenized market value" figure on Home (it is a market stat, not a
  user's stat; belongs on a market overview, not above someone's watchlist)
- All aurora / glow / breathing layers
- 4 of 10 font sizes
- 13 of 19 pill shapes
- The `1:1` badge variant (mixes units with `+0.65%` in the same column slot)
- Repeated `STOCK` / `TOKEN` labels on every row — they become column headers,
  printed once
```
