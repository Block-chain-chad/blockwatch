// Features compiled out of the iPhone build. `npm run build:ios` builds in
// mode "ios", which loads .env.ios and sets VITE_BUILD_TARGET=ios. Vite
// writes that value into the code at build time, so in the iPhone build the
// condition below is a constant, these exports are null, nothing uses the
// modules behind them, and their code and copy never reach the bundle.
// scripts/check-ios-bundle.mjs fails the iPhone build if they do.
//
// A build-time switch on purpose: a feature flag or isNativeApp() is decided
// at run time, so the code would still ship in the app.
//
// Holdings is web only in version one (holdings-build-brief-v3.md section 12).

import HoldingsScreen from './screens/Holdings'
import { HoldingsProvider as HoldingsState } from './state/HoldingsContext'

export const Holdings = import.meta.env.VITE_BUILD_TARGET === 'ios' ? null : HoldingsScreen
export const HoldingsProvider = import.meta.env.VITE_BUILD_TARGET === 'ios' ? null : HoldingsState
