# Desktop audit and first build brief

Written 2026-09-05 against `main` at `a67c1ae`. Read-only audit; nothing was changed.

**One-breath version.** On a wide screen the app is a phone that has been stretched, not a desktop app. Home already has a real table at 1024px and up, but every other screen is a phone column pulled out to 1200px, and opening an asset drops a 448px phone card over the middle of that table. The cheapest honest step towards "TradingView for tokenized stocks" is to dock that card: at 1024px and up, the asset screen becomes two panes, the watchlist pinned left (reusing the phone row as-is) and the existing asset content on the right. Phones do not change. A builder can do that from the brief at the bottom without asking anything.

---

## 1. What desktop does today, file by file

Tailwind v4 is in use, so `lg:` means a viewport of 64rem = **1024px** and wider. Nothing below that width is touched by any desktop rule in the codebase. Only four files contain a `lg:` rule at all: `src/App.jsx`, `src/screens/Home.jsx`, `src/components/TabBar.jsx` and `src/components/shared.jsx`. `src/index.css` has **no** `lg:` or media rule for layout; its only breakpoint-like rule is `@media (hover: hover)` for row hover. The one layout token is `--content-max: 1200px` (`src/index.css`, in `:root`).

### The shell — `src/App.jsx` lines 100–105

```
mx-auto min-h-dvh max-w-md bg-zinc-950 md:border-x lg:max-w-[var(--content-max)]
```

Below 1024px the whole app is a centred 448px column (`max-w-md`). From 768px it gets hairline side borders. From 1024px it opens to 1200px. Every screen and every overlay is rendered inside this one div. The comment in the file says why: the iOS build renders inside the same shell, so the phone width is the default and desktop is the exception.

### Home — `src/screens/Home.jsx` lines 148–187

This is the only screen that knows about desktop. It renders two lists and hides one with CSS:

- Phone list (`lg:hidden`, lines 162–171): the two-line `AssetRow` per asset, under a phone column header ("Asset" / "Gap · token / stock", lines 149–157, also `lg:hidden`).
- Desktop table (`hidden lg:block`, lines 174–184): `AssetTableHeader` once, then `AssetTableRow` per asset.

Both lists are always mounted; only visibility changes. Above the list at every width: the brand `Header`, the `SearchBar` (a `flex` button with `mx-4`, so at 1200px it is a 1168px-wide search box), the `SessionLine` caption, the `FilterChips`, and under Bonds the `TreasuryYields` block. None of these have desktop rules; they render at phone spacing across the full 1200px.

### The table — `src/components/shared.jsx` lines 220–283

`AssetTableRow` is a 7-column CSS grid: asset (logo + ticker + name), gap bar (132px), gap %, token price, stock price, 7-day sparkline, chain. Row height is `--row-h-pointer` (44px). `AssetTableHeader` is `sticky top-0`. The column template (`COLS`, line 228) has a hard minimum of roughly **830px** once the fixed columns, six 16px gaps and the 16px gutters are added up. That number matters below: this row cannot be a sidebar.

`AssetRow` (lines 180–218) is the phone row: logo, ticker over name, optional sparkline (hidden under 360px viewport), then a gap bar (`barWidth`, default 88) with the gap % and "token / stock" prices beneath. It is designed for a ~390px column and takes a `barWidth` prop. It is used by Home (phone) and by `FolderDetail` in `src/screens/Folders.jsx` line 224.

### The tab bar — `src/components/TabBar.jsx`

`fixed inset-x-0 bottom-0`, full window width, with the items in an inner `max-w-md lg:max-w-[var(--content-max)]` box that tracks the shell. From 1024px the five items stop being a stretched row of icons and become left-aligned icon-plus-label buttons (`lg:flex-row lg:max-w-28 lg:justify-start`). It is still a bottom bar on desktop — there is no top nav or side rail.

### The asset screen — `src/screens/AssetDetail.jsx` line 142

```
screen-in fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto bg-zinc-950 pb-10
```

This is the finding that drives everything else. The asset screen is a **fixed-position phone column, 448px wide, centred in the window**, at every width. It has no `lg:` rule. On a 1440px monitor:

- The column floats over the middle of the Home table. The table's left and right thirds stay visible either side of it, and because the fixed element is only 448px wide those parts of the table remain clickable — clicking a half-hidden row swaps the detail (the `key={openAssetId}` remount in App.jsx). It works by accident and looks like a bug.
- The tab bar (`z-20`) is covered where the column is and visible either side of it.
- The chart inside is ~432px wide, the same as on a phone. `DualLineChart` and `PremiumChart` are SVGs with a fixed `viewBox` (360×180 and similar) and `className="w-full"`, so they scale with their container — including their axis text (`fontSize="10"` in viewBox units) and stroke widths. Today that is invisible because the container is phone width. It stops being invisible the moment the chart gets a wide pane; see §4.

Inside the column, top to bottom: sticky header (Back / star / share), name + ticker, the gap panel (gap %, gap bar, token and share prices with per-leg age), the token-move caption and bid/ask line, the thin-market note, the dual-line chart with legend chips, the premium history chart, range chips, "Add to folder" / "Set alert", the Jupiter or Swap button, "Trades on", "Also tokenized by" (siblings, switch in place), Stats, Key statistics (disclosure), About, Analyst ratings, Earnings, news, Details (disclosure), Updated-ago, and four sheets (folders, alert, share, swap) mounted on demand. It is one long scroll and the whole thing is what a desktop right pane needs to show.

Data wiring worth knowing for the brief: the screen subscribes to its own id plus every sibling with the same underlying (`useAssetSubscription(\`detail:${assetId}\`, subIds)`, line 87), calls `useChartData` and `useStockInfo`, and `onSwitchAsset(id)` (passed from App) is how the sibling list changes asset without unmounting the overlay stack.

### Everything else — no desktop rules at all

- `src/screens/Screener.jsx` (Gaps tab): grouped per-underlying rows with an expand chevron, phone layout stretched to 1200px.
- `src/screens/Folders.jsx`: folder list and `FolderDetail` using the phone `AssetRow` at full shell width; a picker sheet inside the screen is `fixed inset-0 max-w-md`.
- `src/screens/News.jsx`, `src/screens/Trade.jsx`: phone columns stretched.
- Every overlay in `src/overlays/` (`SearchOverlay`, `ProfileSheet`, `AddToFolderSheet`, `SetAlertSheet`, `ShareSheet`, `SwapSheet`, `SignInSheet`, `WelcomeSheet`, `PasswordSheet`, and the rest) is `fixed inset-0 mx-auto max-w-md`, most of them `items-end` bottom sheets. On desktop they are phone-width bottom sheets rising in the middle of the window, with the page visible either side.

### `docs/design-system.md` §7, desktop

The design system already commits to the desktop table: sticky header, 44px rows, premium as "the widest, boldest column after the ticker", max 1200px centred. That is built. It says nothing yet about the asset screen, a watchlist pane, charts, or navigation on desktop. Whatever gets built should be written back into §7.

### One thing to know about iPad

`ios/App/App.xcodeproj` targets device family "1,2" — iPhone and iPad. An iPad in landscape is 1024–1366 CSS px wide, so every `lg:` rule, including the existing Home table, **already fires inside the native app on iPad landscape**. The increment below inherits that; it is not a new exposure, but it means "desktop" also means "iPad on its side", and a build 10 tester on an iPad would see it.

---

## 2. Where this should go

"TradingView for tokenized stocks, where you can also trade" on a desktop screen means the layout is built around the chart, and the list is never more than a glance away. In prose, from 1024px up:

**Three regions.** A watchlist pane on the left, narrow and persistent, showing the rows the user has chosen with their gap, prices and sparkline — the phone Home list, docked. A chart-and-detail region filling the rest, with the two-line chart (token vs share) as the largest object on the screen and the gap figure above it in the display slot it already owns. Below and beside the chart, the material that is already in the asset screen — the two-price panel with per-leg freshness, siblings by issuer, key statistics as the side-by-side stock/token grid, earnings, news — laid out in columns instead of one scroll. Later, the swap panel (rung two of the trading ladder) sits in this region too, which is what "where you can also trade" means on desktop: the order form next to the chart, TradingView-with-a-broker style.

**Navigation moves off the bottom.** A bottom tab bar is a thumb-reach idiom. On desktop the five destinations belong across the top of the shell or down a slim rail; the watchlist pane makes Home mostly redundant as a destination, since it is always on screen.

**Search becomes a field, not a screen.** The `SearchOverlay` covering the whole app is right on a phone. On desktop the search box lives in the watchlist pane's header and results drop under it, so adding an asset never hides the chart.

**Sheets become popovers or side panels.** Add-to-folder, set-alert and share are bottom sheets at phone width today; on desktop they should anchor to the button that opened them.

**Gaps and Folders keep the pane.** Selecting a company on the Gaps tab, or opening a folder, swaps what the left pane lists (that ranking, that folder) and the right region stays the chart. That is the same shape as the watchlist and costs nothing new once the two-pane frame exists.

**The chart has to become pixel-true first.** A "large chart" is not a matter of giving the SVG more room: the axis labels and strokes scale with it. The chart needs to measure its container and draw in real pixels (a `ResizeObserver` setting `W`/`H`, keeping the same scrub maths) before it can be the biggest thing on the screen. That is engineering, not taste, but it touches a component phones render, so it is its own step with its own verification.

Order of increments, each shippable on its own:

1. **Dock the asset screen** (this brief): two panes at `lg:`, watchlist left, existing detail right, phones untouched.
2. **Pixel-true charts**: `DualLineChart` and `PremiumChart` measure their container; then the right pane's content is allowed to grow and the chart gets its size.
3. **Desktop navigation**: top bar or rail at `lg:`, tab bar hidden.
4. **Search in the pane** and **sheets to popovers**.
5. **Gaps / Folders feed the pane**; the swap panel beside the chart.

Steps 3 onward carry real taste decisions (where navigation lives, how wide the panes are once the chart can fill them, what the right region's column layout is). Those are the owner's; see the list at the end.

---

## 3. The first increment

**At 1024px and wider, `AssetDetail` becomes two panes: the watchlist pinned on the left, the asset content on the right. Nothing else changes, and nothing changes on phones.**

Why this one:

- It fixes the one thing on desktop that reads as broken today (a phone card floating over a table), and it is the frame every later increment sits inside.
- It reuses `AssetRow` unchanged. `AssetTableRow` cannot be the sidebar — its grid needs ~830px, which would leave the detail narrower than a phone inside a 1200px shell. The phone row was built for exactly the width a sidebar has.
- Every measurement is taken from something that already exists: the pane is `max-w-md` (448px) wide because that is the phone shell and the width the detail column already is; the divider is `--border-subtle`; the selected row uses the row's existing pressed colour (`bg-zinc-900`, the same class `AssetRow` applies on `active:`), so no new colour or shape enters the system.
- The detail content keeps its exact phone width and layout inside the right pane. That means the chart does not grow, so the SVG scaling issue in §1 is not triggered. A right pane that is wider than its content is the honest state until increment 2 makes the chart safe to grow.
- It needs no data change: watchlist ids, prices and sparklines all come from hooks Home already uses, and the price subscription map is keyed per caller, so a second subscriber for the same ids is the normal case, not a conflict.

What it deliberately does not do: no navigation change, no chart change, no overlay change, no Screener/Folders change, no new tokens in `index.css`, no new file in `src/lib/` (there is no pure logic here that earns a test).

---

## 4. Build brief

Work in a worktree branched from `main`. Do not edit `C:/Users/m/Coding/blockwatch` directly, do not touch `ios/` or `.github/`, do not commit to or push `main`.

### 4.1 Files

- Edit: `src/screens/AssetDetail.jsx` (the root element and one new pane).
- Create: `src/components/WatchlistPane.jsx`.
- Edit: `docs/design-system.md` §7 (a short paragraph recording the two-pane rule).
- Do not edit: `src/components/shared.jsx`, `src/App.jsx`, `src/screens/Home.jsx`, `src/components/TabBar.jsx`, `src/index.css`, any chart, any overlay.

### 4.2 `src/components/WatchlistPane.jsx` (new)

A component that renders the user's watchlist as a column of `AssetRow`s and marks the open asset.

```jsx
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { AssetRow } from './shared'

export default function WatchlistPane({ currentId, onOpen }) {
  const { assets, marketOpen } = usePrices()
  const { watchlistIds } = useFolders()
  useAssetSubscription('detail-watchlist', watchlistIds)
  const sparks = useSparklines(watchlistIds)
  const watched = assets.filter((a) => watchlistIds.includes(a.id))

  if (watched.length === 0) {
    return (
      <p className="t-caption px-4 py-6 text-zinc-500">
        Your watchlist is empty — add the tokens you care about.
      </p>
    )
  }
  return (
    <div>
      <div
        className="flex items-baseline justify-between border-b px-4 pb-1.5 pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Watchlist</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>
      {watched.map((a) => (
        <div
          key={a.id}
          aria-current={a.id === currentId ? 'true' : undefined}
          className={a.id === currentId ? 'bg-zinc-900' : undefined}
        >
          <AssetRow asset={a} onOpen={onOpen} spark={sparks[a.id]} marketOpen={marketOpen} />
        </div>
      ))}
    </div>
  )
}
```

Rules the builder must keep:

- `AssetRow` is used exactly as exported; no new props, no edits to `shared.jsx`. The selected wrapper's `bg-zinc-900` shows through because `AssetRow`'s button carries no background of its own.
- The subscription key is `'detail-watchlist'`, distinct from Home's `'home-watchlist'`; `setSubscription` in `PricesContext` keeps a Map per key, so both may coexist.
- The empty-state copy is the same sentence Home uses (`Home.jsx` line 191). No button: the pane cannot open search, and a button that does nothing is worse than a sentence.
- No filter chips, no search bar, no session line in the pane. Those are Home's; the pane is the list only.
- The header pair "Watchlist" / "Gap · token / stock" mirrors Home's phone column header (`Home.jsx` lines 149–157) so the two columns read the same.
- No error surface. If prices have not arrived, `AssetRow` already renders its own placeholder pulse for the gap and an em dash for missing prices.

### 4.3 `src/screens/AssetDetail.jsx`

**Root element, line 142.** Change

```
<div className="screen-in fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto bg-zinc-950 pb-10">
```

to

```
<div className="screen-in fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto bg-zinc-950 pb-10 lg:flex lg:max-w-[var(--content-max)] lg:overflow-hidden lg:pb-0 lg:border-x" style={{ borderColor: 'var(--border-subtle)' }}>
```

Read that carefully: every class before `lg:` is unchanged, so under 1024px the element is byte-for-byte the same phone column. From 1024px the layer is as wide as the shell (`--content-max`), lays out as a row, and stops scrolling as a whole so each pane scrolls on its own. `lg:pb-0` moves the bottom padding into the right pane (next step) so it is not applied to the flex row. The side borders match the shell's `md:border-x` in `App.jsx` so the layer's edge sits exactly on the shell's edge.

**Wrap the existing content.** Everything from the `<header ...>` on line 146 through the `<UpdatedAgo .../>` on line 877 becomes the right pane. Insert, directly after the root `<div>`:

```jsx
<aside
  className="hidden lg:block lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto lg:border-r"
  style={{ borderColor: 'var(--border-subtle)' }}
>
  <WatchlistPane currentId={asset.id} onOpen={(a) => onSwitchAsset(a.id)} />
</aside>
<div className="lg:min-w-0 lg:flex-1 lg:overflow-y-auto lg:pb-10">
```

and close that `</div>` after `<UpdatedAgo className="pt-4 text-center" />` (line 877), before the four sheets on lines 879–882. The sheets stay direct children of the root, as now: they are `fixed inset-0` and do not care which pane they were rendered from.

Notes the builder needs:

- `lg:w-[28rem]` is 448px, the same value `max-w-md` resolves to (Tailwind's `--container-md`). It is written as an arbitrary value so it does not depend on whether this Tailwind build maps `w-md` to the container scale. Do not pick another number.
- `hidden lg:block` means the pane is mounted on phones but not displayed. That is acceptable for this increment: its only side effects are a price subscription for watchlist ids (which Home already holds whenever the Home tab is mounted) and a sparkline fetch that is cached in `localStorage` for the session. If the builder prefers to avoid the phone-side mount, the only allowed way is a `matchMedia('(min-width: 64rem)')` check with a resize listener inside `WatchlistPane`'s parent; do not introduce a third-party hook.
- The sticky header inside the right pane (`sticky top-0`, line 146) keeps working because the right pane is now the scroll container. Verify it visually.
- `onSwitchAsset` already exists (used by the siblings list, line 504). It changes `openAssetId` in App, which remounts `AssetDetail` via `key`. On desktop that means clicking a watchlist row remounts both panes; the pane re-renders from cached state and the list does not flicker beyond the `screen-in` fade, which is the same fade the phone already shows. Do not try to keep the pane mounted across switches in this increment.
- `import WatchlistPane from '../components/WatchlistPane'` at the top of `AssetDetail.jsx`.
- Do not change the `Back` button, the star, share, or anything below the header. The right pane's content stays `max-w`-less inside its pane; it will be 448px of content sitting at the left edge of a ~750px pane. That is expected. Do not centre it, do not widen it, do not resize the chart.

### 4.4 `docs/design-system.md` §7 "Desktop (≥1024px)"

Append one paragraph after the existing table description:

> Opening an asset on desktop docks it: the watchlist stays on the left at phone-shell width (448px, the same `AssetRow` the phone list uses, selected row in `surface-1`), the asset screen fills the right pane, and each pane scrolls on its own. The asset content keeps its phone width until the charts draw in real pixels; until then a wider pane would only scale the axis text.

### 4.5 What must not change on phones — the acceptance list

Check every one of these at 390px wide (Chrome device toolbar, iPhone 14 preset) after the change:

1. `AssetDetail` root is still `fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto` and scrolls as one column.
2. No watchlist pane is visible; the first thing under the sticky header is the logo + name row.
3. Back, star, share, the sibling switch, and all four sheets behave as before.
4. Home, Gaps, Folders, News, Trade are untouched (no file in that list was edited).
5. `npm run lint` and `npm run test` pass (`oxlint`, `vitest run`) and `npm run build` succeeds.

And at 1280px wide:

6. The Home table is fully covered when an asset is open (no half-visible rows either side).
7. The watchlist is on the left at 448px with the open asset's row in `bg-zinc-900`; clicking another row switches the right pane.
8. The right pane scrolls on its own and the Back/star/share header stays pinned to its top.
9. The chart is the same size it is on a phone (not stretched).
10. The tab bar is hidden behind the layer; Back reveals it again.

Also check 1024px exactly (the breakpoint) and an iPad landscape preset, because the native build targets iPad.

### 4.6 Commit

One commit, on the worktree branch. Title along the lines of "Dock the asset screen beside the watchlist on desktop". The body should say, in prose, that the asset screen was a phone column floating over the desktop table, that the phone row is the sidebar because the table row's grid needs ~830px, that the detail keeps its phone width on purpose until the charts draw in real pixels, and that nothing under 1024px changed. End with the trailer line:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## 5. Decisions only the owner can make

None block the increment above. All of them block the increments after it.

1. **Pane widths once the chart can grow.** After increment 2, how wide is the watchlist (stay at 448px, or narrower like TradingView's ~300px panel) and does the detail content widen to fill or stay a column with the chart alone growing?
2. **Where desktop navigation lives.** Top bar across the shell, or a slim left rail beside the watchlist. The bottom tab bar cannot stay on desktop, but which replacement is a taste call.
3. **Whether the right region becomes multi-column.** The asset screen is one scroll of ~15 sections. On a wide pane they could sit in two columns (chart + prices left, statistics + earnings + news right). Which sections go where is the owner's.
4. **Whether Gaps and Folders drive the left pane.** Same frame, different list — but it changes what "Home" means on desktop.
5. **Where the swap panel goes on desktop.** Beside the chart (the "where you can also trade" promise) or still a sheet.
6. **iPad.** The native build targets iPad and `lg:` fires in landscape. Either that is wanted (iPad gets the desktop layout) or the desktop rules should be gated to `isNativeApp() === false`. The current Home table already has this property, so it is an existing decision to make explicit, not a new one.
