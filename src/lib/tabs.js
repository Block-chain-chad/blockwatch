// The five destinations, shared by the phone TabBar (a row along the bottom)
// and the desktop NavRail (a column down the left). A module of its own so
// both component files export only components — Fast Refresh keeps state
// across edits only then.

import { HomeIcon, FolderIcon, NewsIcon, TradeIcon, TrendIcon } from '../components/Icons'

export const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'screener', label: 'Gaps', Icon: TrendIcon },
  { id: 'folders', label: 'Folders', Icon: FolderIcon },
  { id: 'news', label: 'News', Icon: NewsIcon },
  { id: 'trade', label: 'Venues', Icon: TradeIcon },
]
