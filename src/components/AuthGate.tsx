import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../services/supabase'
import './AuthGate.css'

type Access =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'approved'; email: string }
  | { status: 'pending'; email: string; userId: string }
  | { status: 'error'; message: string }

export default function AuthGate({ children }: {
  children: (email: string) => ReactNode
}) {
  const [access, setAccess] = useState<Access>({ status: 'checking' })
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let current = true
    let revision = 0

    async function verify(session: Session | null) {
      const check = ++revision
      if (!session) {
        if (current) setAccess({ status: 'signed-out' })
        return
      }

      if (current) setAccess({ status: 'checking' })
      const { data, error } = await supabase
        .from('app_users')
        .select('email')
        .eq('email', session.user.email ?? '')
        .maybeSingle()

      if (!current || check !== revision) return
      if (error) {
        setAccess({ status: 'error', message: 'Could not verify your account. Please try again.' })
      } else if (data) {
        setAccess({ status: 'approved', email: session.user.email ?? '' })
      } else {
        setAccess({
          status: 'pending',
          email: session.user.email ?? '',
          userId: session.user.id,
        })
      }
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!current) return
      if (error) setAccess({ status: 'error', message: 'Could not start sign-in. Please refresh this page.' })
      else void verify(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase requests until the auth event callback has returned.
      setTimeout(() => { if (current) void verify(session) }, 0)
    })

    return () => {
      current = false
      revision++
      listener.subscription.unsubscribe()
    }
  }, [])

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setFormError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (error) setFormError(error.message)
    else setSent(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSent(false)
    setAccess({ status: 'signed-out' })
  }

  if (access.status === 'approved') return <>{children(access.email)}</>

  return (
    <main className="auth-page">
      <div className="auth-brand"><span>H<span className="auth-dot">.</span></span> Herald College <small>STUDENT SPACE</small></div>
      <section className="auth-card">
        <div className="auth-icon"><LockKeyhole size={22} /></div>
        {access.status === 'checking' ? (
          <><h1>Opening your workspace</h1><p>Checking your account access…</p></>
        ) : access.status === 'pending' ? (
          <>
            <h1>Account access pending</h1>
            <p>You signed in as <strong>{access.email}</strong>, but this account has not been approved for UniSync yet.</p>
            <p className="auth-help">Account ID: <code>{access.userId}</code></p>
            <button className="auth-secondary" onClick={signOut}>Use another email</button>
          </>
        ) : access.status === 'error' ? (
          <><h1>We couldn’t verify access</h1><p>{access.message}</p><button className="auth-secondary" onClick={() => window.location.reload()}>Try again</button></>
        ) : sent ? (
          <>
            <h1>Check your email</h1>
            <p>We sent a secure sign-in link to <strong>{email}</strong>. Open it on this device to continue.</p>
            <button className="auth-secondary" onClick={() => setSent(false)}>Use another email</button>
          </>
        ) : (
          <>
            <h1>Your college, in one place.</h1>
            <p>Sign in to your private Herald College workspace.</p>
            <form onSubmit={requestLink}>
              <label htmlFor="sign-in-email">Email address</label>
              <div className="auth-input"><Mail size={18} /><input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></div>
              {formError && <p className="auth-error" role="alert">{formError}</p>}
              <button className="auth-submit" type="submit" disabled={sending}>{sending ? 'Sending link…' : 'Email me a sign-in link'}<ArrowRight size={17} /></button>
            </form>
          </>
        )}
      </section>
      <p className="auth-footer">UniSync · Your personal student assistant</p>
    </main>
  )
}
