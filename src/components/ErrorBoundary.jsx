import { Component } from 'react'

/**
 * Top-level crash screen. One render throw anywhere below this point used to
 * blank the app to a white screen — survivable on the web (reload button in
 * the address bar), a dead end in the native app, which has no address bar.
 *
 * Deliberately dependency-free: it imports no context, no analytics and no app
 * state, because it has to keep working when a provider is the thing that
 * threw. Styling relies only on index.css.
 *
 * Error boundaries must be class components (React 19), and they only catch
 * errors thrown while RENDERING — not in event handlers or async callbacks.
 * That's expected; those paths handle their own failures.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Console only — no network call, nothing that could throw in turn.
    console.error('App crashed:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-8 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)] text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Something broke on our side</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
          Not your fault, and nothing is lost — your watchlist, folders and alerts are saved on
          this device. Reloading usually clears it.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-zinc-900 p-3 text-left text-[11px] leading-relaxed text-loss">
            {String(error?.stack ?? error?.message ?? error)}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full max-w-xs rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 active:bg-accent-dim"
        >
          Reload app
        </button>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-2 w-full max-w-xs rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    )
  }
}
