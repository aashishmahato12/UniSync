import './Profile.css'
import { useEffect, useState } from 'react'
import {
  Bell,
  CalendarDays,
  Moon,
  ShieldCheck,
} from 'lucide-react'

import {
  PageIntro,
  SectionHeading,
} from '../components/UI'
import { supabase } from '../services/supabase'
import { accountInitials, accountName, hasConnectedMailbox } from '../services/accountIdentity'
import { connectMail, disconnectMail, getMailConnection, type MailConnection } from '../services/mailConnection'

export default function Profile({
  notify,
  email,
  theme,
  themeMode,
  setThemeMode,
}: {
  notify: (message: string) => void
  email: string
  theme: 'light' | 'dark'
  themeMode: 'system' | 'light' | 'dark'
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void
}) {
  const [notifications, setNotifications] =
    useState(true)

  const [calendarApproval, setCalendarApproval] =
    useState(true)
  const [mailConnection, setMailConnection] = useState<MailConnection | null>(null)
  const [mailBusy, setMailBusy] = useState(false)
  const [mailError, setMailError] = useState('')
  const [mailUnavailable, setMailUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    void getMailConnection().then(result => { if (active) setMailConnection(result) })
      .catch(error => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Could not check Gmail.'
        if (message.includes('not configured')) setMailUnavailable(true)
        else setMailError(message)
      })
    return () => { active = false }
  }, [email])

  useEffect(() => {
    const url = new URL(window.location.href)
    const result = url.searchParams.get('mail')
    if (!result) return
    url.searchParams.delete('mail')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    if (result === 'connected') notify('Gmail connected to your account.')
    else if (result === 'failed') setMailError('Gmail could not be connected. Please try again.')
    else setMailError('Gmail connection was cancelled.')
  }, [notify])

  const startMailConnection = async () => {
    setMailBusy(true); setMailError('')
    try { await connectMail() }
    catch (error) {
      setMailError(error instanceof Error ? error.message : 'Could not connect Gmail.')
      setMailBusy(false)
    }
  }

  const removeMailConnection = async () => {
    setMailBusy(true); setMailError('')
    try {
      setMailConnection(await disconnectMail())
      notify('Gmail disconnected from your account.')
    } catch (error) {
      setMailError(error instanceof Error ? error.message : 'Could not disconnect Gmail.')
    } finally { setMailBusy(false) }
  }

  return (
    <>
      <PageIntro
        title="Profile & preferences"
        copy="Your student account and assistant preferences."
      />

      <div className="profile-layout">
        <section className="panel profile-card">
          <div className="profile-cover" />

          <div className="profile-main">
            <span className="profile-avatar">{accountInitials(email)}</span>

            <h2>{accountName(email)}</h2>
            <p>Herald College student</p>

            <div className="profile-details">
              <div>
                <span>Student ID</span>
                <strong>Add your ID</strong>
              </div>

              <div>
                <span>Program</span>
                <strong>Add your program</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{email}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel preference-card">
          <SectionHeading
            eyebrow="PREFERENCES"
            title="Assistant settings"
          />

          <div className="preference-row">
            <span className="preference-icon">
              <Bell size={19} />
            </span>

            <div>
              <strong>Notice notifications</strong>
              <p>Notify me about important college notices.</p>
            </div>

            <button
              className={`toggle ${
                notifications ? 'on' : ''
              }`}
              onClick={() => {
                setNotifications(!notifications)
                notify('Preference updated.')
              }}
            >
              <i />
            </button>
          </div>

          <div className="preference-row">
            <span className="preference-icon">
              <Moon size={19} />
            </span>

            <div>
              <strong>Appearance</strong>
              <p>{themeMode === 'system' ? `Following your device · currently ${theme}` : `Using ${themeMode} mode`}</p>
            </div>

            <div className="theme-options" aria-label="Appearance setting">
              {(['system', 'light', 'dark'] as const).map(mode => <button
                key={mode}
                className={themeMode === mode ? 'selected' : ''}
                onClick={() => setThemeMode(mode)}
                aria-pressed={themeMode === mode}
              >{mode === 'system' ? 'Device' : mode[0].toUpperCase() + mode.slice(1)}</button>)}
            </div>
          </div>

          <div className="preference-row">
            <span className="preference-icon">
              <CalendarDays size={19} />
            </span>

            <div>
              <strong>Approve calendar events</strong>
              <p>Review events before adding them.</p>
            </div>

            <button
              className={`toggle ${
                calendarApproval ? 'on' : ''
              }`}
              onClick={() => {
                setCalendarApproval(!calendarApproval)
                notify('Preference updated.')
              }}
            >
              <i />
            </button>
          </div>

          <div className="connection-card">
            <div>
              <ShieldCheck size={20} />
              <strong>Integrations</strong>
            </div>

            <p>{mailConnection?.status === 'connected'
              ? `College mail is connected through ${mailConnection.email}. ${mailConnection.lastSyncedAt
                ? 'Your inbox and sent emails stay in your account.'
                : 'Waiting for the first inbox sync.'}`
              : mailConnection?.status === 'legacy' || (!mailConnection && hasConnectedMailbox(email))
                ? 'Your original college Gmail workflow is connected to this workspace.'
                : mailUnavailable
                  ? 'Personal Gmail connection is being set up.'
                  : mailConnection?.status === 'reconnect_required'
                  ? 'Google access expired. Reconnect Gmail to resume your inbox and sending.'
                  : 'Google will ask for mailbox read and send access. UniSync imports college-sender messages and summarizes them with the assistant.'}</p>

            <span>{mailConnection?.status === 'connected' || mailConnection?.status === 'legacy'
              || (!mailConnection && hasConnectedMailbox(email)) ? 'Connected' : 'Not connected'}</span>
            {mailConnection?.status !== 'legacy' && !hasConnectedMailbox(email) && !mailUnavailable && <div className="connection-actions">
              {mailConnection?.status === 'connected'
                ? <button type="button" disabled={mailBusy} onClick={() => void removeMailConnection()}>Disconnect Gmail</button>
                : <button type="button" disabled={mailBusy} onClick={() => void startMailConnection()}>{mailBusy ? 'Opening Google…' : 'Connect Gmail'}</button>}
            </div>}
            {mailError && <p className="connection-error" role="alert">{mailError}</p>}
          </div>

          <button className="profile-signout" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
          <nav className="profile-legal" aria-label="Legal pages">
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
          </nav>
        </section>
      </div>
    </>
  )
}
