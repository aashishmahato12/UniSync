import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../services/supabase'
import CodeSlots from './CodeSlots'
import './AuthGate.css'

type Access =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'approved'; email: string }
  | { status: 'error'; message: string }

export default function AuthGate({ children }: {
  children: (email: string) => ReactNode
}) {
  const [access, setAccess] = useState<Access>({ status: 'checking' })
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [sending, setSending] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'idle' | 'error' | 'success'>('idle')
  const [formError, setFormError] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const clearCodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let current = true
    let revision = 0
    let approvedUserId = ''
    let approvedEmail = ''

    async function verify(session: Session | null) {
      const check = ++revision
      if (!session?.user.email) {
        approvedUserId = ''
        approvedEmail = ''
        if (current) setAccess({ status: 'signed-out' })
        return
      }
      const sessionEmail = session.user.email.trim().toLowerCase()
      // SIGNED_IN can fire again when a background tab becomes active.
      // Keep the workspace mounted for the same account and on token refresh.
      if (approvedUserId === session.user.id && approvedEmail === sessionEmail) return

      if (current) setAccess({ status: 'checking' })
      const { data, error } = await supabase
        .from('app_users')
        .select('email')
        .eq('email', sessionEmail)
        .maybeSingle()

      if (!current || check !== revision) return
      if (error) {
        setAccess({ status: 'error', message: 'Could not check your account. Please try again.' })
        return
      }
      if (!data) {
        // The database policy permits a verified user to create only their
        // own account. The browser cannot approve an arbitrary email.
        const { error: createError } = await supabase.from('app_users').insert({ email: sessionEmail })
        if (!current || check !== revision) return
        if (createError && createError.code !== '23505') {
          setAccess({ status: 'error', message: 'Your email is verified, but account setup is not ready. Please try again later.' })
          return
        }
      }
      approvedUserId = session.user.id
      approvedEmail = sessionEmail
      setAccess({ status: 'approved', email: sessionEmail })
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'SIGNED_OUT') {
        setSentTo('')
        setCode('')
        setCodeStatus('idle')
        setFormError('')
        setResendSeconds(0)
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Supabase advises making database calls after the auth callback returns.
        setTimeout(() => { if (current) void verify(session) }, 0)
      }
    })

    return () => {
      current = false
      revision++
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!resendSeconds) return
    const timer = window.setInterval(() => setResendSeconds(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds > 0])

  useEffect(() => () => {
    if (clearCodeTimer.current) clearTimeout(clearCodeTimer.current)
  }, [])

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const target = email.trim().toLowerCase()
    if (!target) return
    setSending(true)
    setFormError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    })
    setSending(false)
    if (error) setFormError(error.message)
    else {
      setSentTo(target)
      setCode('')
      setCodeStatus('idle')
      setResendSeconds(60)
    }
  }

  async function signInWithGoogle() {
    setGoogleBusy(true)
    setFormError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setFormError(error.message)
      setGoogleBusy(false)
    }
  }

  async function verifyCode(value: string) {
    if (verifying || !sentTo) return
    setVerifying(true)
    setFormError('')
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: value, type: 'email' })
    setVerifying(false)
    if (error) {
      setCodeStatus('error')
      setFormError('That code did not work. Check the email and try again.')
      if (clearCodeTimer.current) clearTimeout(clearCodeTimer.current)
      clearCodeTimer.current = setTimeout(() => { setCode(''); setCodeStatus('idle') }, 650)
    } else {
      setCodeStatus('success')
    }
  }

  if (access.status === 'approved') return <>{children(access.email)}</>

  return <main className="auth-page">
    <div className="auth-story">
      <div className="auth-brand"><span>H<span className="auth-dot">.</span></span> Herald College <small>STUDENT SPACE</small></div>
      <div className="auth-story-copy">
        <span>UNISYNC / PERSONAL CAMPUS DESK</span>
        <h2>Less inbox.<br /><em>More clarity.</em></h2>
        <p>Notices, dates and documents from Herald College, all in one space built around you.</p>
        <div className="auth-story-tags"><span>01 / NOTICES</span><span>02 / SCHEDULE</span><span>03 / FILES</span></div>
      </div>
      <div className="auth-story-footer">HERALD COLLEGE <span>✳</span> YOUR SPACE, YOUR PACE</div>
    </div>
    <section className="auth-card">
      <div className="auth-icon"><LockKeyhole size={22} /></div>
      {access.status === 'checking' ? (
        <><h1>Opening your workspace</h1><p>Checking your account…</p></>
      ) : access.status === 'error' ? (
        <><h1>We couldn’t open your account</h1><p>{access.message}</p><button className="auth-secondary" onClick={() => window.location.reload()}>Try again</button></>
      ) : sentTo ? (
        <>
          <h1>Enter your sign-in code</h1>
          <p>Check <strong>{sentTo}</strong> for a six-digit code. If the email has a sign-in link, you can open that instead.</p>
          <CodeSlots value={code} onChange={next => { setCode(next); if (codeStatus === 'error') setCodeStatus('idle') }} onComplete={value => void verifyCode(value)} status={codeStatus} disabled={verifying} />
          {formError && <p className="auth-error" role="alert">{formError}</p>}
          <button className="auth-secondary auth-resend" disabled={sending || resendSeconds > 0} onClick={() => void requestCode()}>{sending ? 'Sending…' : resendSeconds ? `Send another code in ${resendSeconds}s` : 'Send another code'}</button>
          <button className="auth-plain-button" onClick={() => { setSentTo(''); setCode(''); setFormError('') }}>Use another email</button>
        </>
      ) : (
        <>
          <h1>Your college, in one place.</h1>
          <p>Sign in or create your private UniSync account.</p>
          <button className="auth-google" type="button" disabled={googleBusy || sending} onClick={() => void signInWithGoogle()}>
            <span className="auth-google-mark" aria-hidden="true">G</span>
            {googleBusy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <div className="auth-divider"><span>or use email</span></div>
          <form onSubmit={requestCode}>
            <label htmlFor="sign-in-email">Email address</label>
            <div className="auth-input"><Mail size={18} /><input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            {formError && <p className="auth-error" role="alert">{formError}</p>}
            <button className="auth-submit" type="submit" disabled={sending}>{sending ? 'Sending code…' : 'Continue with email'}<ArrowRight size={17} /></button>
          </form>
        </>
      )}
    </section>
    <p className="auth-footer">PRIVATE ACCESS · POWERED BY UNISYNC</p>
  </main>
}
