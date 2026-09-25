import './Profile.css'
import { useState } from 'react'
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

            <p>{hasConnectedMailbox(email)
              ? 'Your college Gmail intake is connected to this workspace.'
              : 'Your account is private. College Gmail intake and outgoing email are not connected yet.'}</p>

            <span>{hasConnectedMailbox(email) ? 'Connected' : 'Not connected'}</span>
          </div>

          <button className="profile-signout" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
        </section>
      </div>
    </>
  )
}
