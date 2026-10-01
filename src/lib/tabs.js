// The destinations, shared by the phone TabBar (a row along the bottom) and
// the desktop NavRail (a column down the left). A module of its own so both
// component files export only components — Fast Refresh keeps state across
// edits only then.
//
// Holdings is web only in version one, so the iPhone build has four tabs
// (see src/webOnly.js for the build-time switch).

import { HomeIcon, FolderIcon, NewsIcon, HoldingsIcon, TrendIcon } from '../components/Icons'

export const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'screener', label: 'Gaps', Icon: TrendIcon },
  { id: 'folders', label: 'Folders', Icon: FolderIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
  ...(import.meta.env.VITE_BUILD_TARGET === 'ios' ? [] : [{ id: 'holdings', label: 'Holdings', Icon: HoldingsIcon }]),
]
