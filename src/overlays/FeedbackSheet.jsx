import { useState } from 'react'
import { sendFeedback } from '../services/feedback'
import { useWaitlist } from '../state/WaitlistContext'
import Sheet, { SheetTitle } from '../components/Sheet'

/* "Help & feedback" — a simple form that actually delivers (Supabase table). */
export default function FeedbackSheet({ onClose }) {
  const { entry } = useWaitlist()
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(entry?.email ?? '')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function submit(e) {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      await sendFeedback(message.trim(), email.trim() || null)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Sheet onClose={onClose} className="z-[55]">
      {status === 'sent' ? (
        <div className="px-1 py-6 text-center">
          <SheetTitle className="text-base font-semibold">Thanks. We read every one.</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Early feedback like yours decides what gets built next.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <SheetTitle className="px-1 text-base font-semibold">Help & feedback</SheetTitle>
          <p className="mt-0.5 px-1 text-xs text-zinc-500">
            Bug, missing token, feature idea, anything. It lands straight with us.
          </p>
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What's on your mind?"
            className="mt-3 w-full resize-none rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email for a reply (optional)"
            className="mt-2 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
          />
          {status === 'error' && (
            <p className="mt-2 px-1 text-xs text-zinc-400">
              That didn't send. Our fault, not yours. Your message is still here, so give it
              another try in a moment.
            </p>
          )}
          <button
            type="submit"
            disabled={!message.trim() || status === 'sending'}
            className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
          >
            {status === 'sending' ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      )}
    </Sheet>
  )
}
