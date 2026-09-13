import './Dashboard.css'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  Sparkles,
} from 'lucide-react'

import {
  formatDate,
  today,
  type EventItem,
  type Notice,
  type Payment,
} from '../data'

import {
  EmptyState,
  SectionHeading,
} from '../components/UI'

type Page =
  | 'Dashboard'
  | 'Notices'
  | 'Events'
  | 'Calendar'
  | 'Payments'
  | 'Documents'
  | 'Ask AI'
  | 'Profile'

export default function Dashboard({
  events,
  notices,
  payments,
  navigate,
  onNotice,
}: {
  events: EventItem[]
  notices: Notice[]
  payments: Payment[]
  navigate: (page: Page) => void
  onNotice: (notice: Notice) => void
}) {
  const upcoming = [...events]
    .filter(
      event =>
        event.date >= today &&
        event.calendarState !== 'Ignored'
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const due = payments.find(payment => payment.status === 'Due')

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            {new Date()
              .toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
              .toUpperCase()}
          </div>

          <h1>
            Good afternoon, Aashish <span className="wave">✳</span>
          </h1>

          <p>Here’s what’s happening at Heritage College.</p>
        </div>

        <button
          className="outline-button"
          onClick={() => navigate('Calendar')}
        >
          <CalendarDays size={17} />
          View calendar
        </button>
      </div>

      <div className="hero-alert">
        <div className="alert-symbol">
          <AlertCircle size={23} />
        </div>

        <div className="hero-alert-copy">
          <span>NEEDS YOUR ATTENTION</span>

          <h3>Semester fee payment is due soon</h3>

          <p>
            Complete your payment by{' '}
            {due
              ? formatDate(due.dueDate, {
                  month: 'long',
                  day: 'numeric',
                })
              : 'the deadline'}.
          </p>
        </div>

        <button onClick={() => navigate('Payments')}>
          Review payment
          <ArrowRight size={17} />
        </button>
      </div>

      <div className="dashboard-grid">
        <section className="panel upcoming-panel">
          <SectionHeading
            eyebrow="YOUR SCHEDULE"
            title="Upcoming"
            action={
              <button
                className="text-link"
                onClick={() => navigate('Events')}
              >
                View all
                <ArrowRight size={15} />
              </button>
            }
          />

          <div className="upcoming-list">
            {upcoming.length ? (
              upcoming.map(event => (
                <button
                  className="upcoming-row"
                  key={event.id}
                  onClick={() => navigate('Events')}
                >
                  <div className="date-tile">
                    <strong>
                      {new Date(
                        `${event.date}T12:00:00`
                      ).getDate()}
                    </strong>

                    <span>
                      {formatDate(event.date, {
                        month: 'short',
                      }).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <strong>{event.title}</strong>

                    <span>
                      {event.time ? `${event.time} · ` : ''}
                      {event.category}
                    </span>
                  </div>

                  <ChevronRight size={17} />
                </button>
              ))
            ) : (
              <EmptyState
                title="No upcoming events"
                copy="Detected events will appear here."
              />
            )}
          </div>
        </section>

        <section className="panel notice-panel">
          <SectionHeading
            eyebrow="LATEST UPDATES"
            title="Recent notices"
            action={
              <button
                className="text-link"
                onClick={() => navigate('Notices')}
              >
                View all
                <ArrowRight size={15} />
              </button>
            }
          />

          <div className="notice-mini-list">
            {notices.length ? (
              notices.slice(0, 3).map(notice => (
                <button
                  className="notice-mini"
                  key={notice.id}
                  onClick={() => onNotice(notice)}
                >
                  <span
                    className={`notice-mini-icon ${
                      notice.priority === 'High'
                        ? 'urgent'
                        : ''
                    }`}
                  >
                    <FileText size={17} />
                  </span>

                  <span>
                    <strong>{notice.title}</strong>

                    <small>
                      {notice.category} · {formatDate(notice.date)}
                    </small>
                  </span>

                  <ChevronRight size={17} />
                </button>
              ))
            ) : (
              <EmptyState
                title="No notices"
                copy="Processed emails will appear here."
              />
            )}
          </div>
        </section>

        <section className="panel ai-brief-panel">
          <div className="brief-heading">
            <div className="brief-icon">
              <Sparkles size={19} />
            </div>

            <div>
              <span className="eyebrow">MADE FOR YOU</span>
              <h2>AI brief</h2>
            </div>
          </div>

          <p>
            You currently have <strong>{events.length}</strong> detected
            events and <strong>{notices.length}</strong> notices.
          </p>

          <button
            className="text-link"
            onClick={() => navigate('Ask AI')}
          >
            Ask a follow-up
            <ArrowRight size={15} />
          </button>
        </section>

        <section className="panel action-panel">
          <SectionHeading
            eyebrow="NEXT STEPS"
            title="Action required"
          />

          <div className="action-item">
            <span className="action-check">
              <CreditCard size={17} />
            </span>

            <div>
              <strong>Submit your fee receipt</strong>
              <span>Upload proof of payment.</span>
            </div>

            <button onClick={() => navigate('Payments')}>
              Continue
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="action-item">
            <span className="action-check">
              <CalendarDays size={17} />
            </span>

            <div>
              <strong>Review pending events</strong>
              <span>Choose what goes on your calendar.</span>
            </div>

            <button onClick={() => navigate('Events')}>
              Review
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </>
  )
}