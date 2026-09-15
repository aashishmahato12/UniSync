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

export default function Profile({
  notify,
  email,
  theme,
  toggleTheme,
}: {
  notify: (message: string) => void
  email: string
  theme: 'light' | 'dark'
  toggleTheme: () => void
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
            <span className="profile-avatar">AM</span>

            <h2>Aashish Mahato</h2>
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
              <strong>Dark mode</strong>
              <p>Use a darker theme throughout UniSync.</p>
            </div>

            <button
              className={`toggle ${theme === 'dark' ? 'on' : ''}`}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            >
              <i />
            </button>
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

            <p>
              Gmail → n8n → Supabase is connected to your
              workspace.
            </p>

            <span>Development</span>
          </div>

          <button className="profile-signout" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
        </section>
      </div>
    </>
  )
}
