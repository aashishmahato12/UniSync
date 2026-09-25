import './Dashboard.css'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  FolderOpen,
  Mail,
  Sparkles,
} from 'lucide-react'
import { formatDate, money, today, type CalendarState, type EventItem, type Notice, type Payment } from '../data'

type Page = 'Dashboard' | 'Notices' | 'Calendar' | 'Payments' | 'Documents' | 'College Email' | 'Ask AI' | 'Profile'

export default function Dashboard({
  events,
  notices,
  payments,
  navigate,
  onNotice,
  updateCalendar,
  onPaymentStatus,
}: {
  events: EventItem[]
  notices: Notice[]
  payments: Payment[]
  navigate: (page: Page) => void
  onNotice: (notice: Notice) => void
  updateCalendar: (event: EventItem, state: CalendarState) => Promise<void>
  onPaymentStatus: (id: string, status: 'Due' | 'Paid') => void
}) {
  const [busyEventId, setBusyEventId] = useState<string | null>(null)
  const upcoming = events
    .filter(event => event.date >= today && event.calendarState !== 'Ignored')
    .sort((a, b) => a.date.localeCompare(b.date))
  const pending = events
    .filter(event => event.calendarState === 'Pending')
    .sort((a, b) => a.date.localeCompare(b.date))
  const duePayments = payments
    .filter(payment => payment.status === 'Due' && payment.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const soon = new Date(`${today}T12:00:00`)
  soon.setDate(soon.getDate() + 30)
  const soonDate = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`
  const actionPayment = duePayments.find(payment => payment.dueDate <= soonDate)
  const actionCount = pending.length + (actionPayment ? 1 : 0)
  const latestNotices = [...notices].sort((a, b) => (b.receivedAt || b.date).localeCompare(a.receivedAt || a.date)).slice(0, 3)
  const nextDates = [
    ...upcoming.map(event => ({ date: event.date, title: event.title, kind: 'Event', page: 'Calendar' as Page })),
    ...duePayments.filter(payment => payment.dueDate >= today).map(payment => ({ date: payment.dueDate, title: payment.title, kind: 'Fee', page: 'Payments' as Page })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const nextDate = nextDates[0]
  const openEventEmail = (event: EventItem) => {
    const sourceNotice = notices.find(notice => notice.gmailMessageId && notice.gmailMessageId === event.gmailMessageId)
    if (sourceNotice) onNotice(sourceNotice)
    else navigate('Notices')
  }
  const decideCalendar = async (event: EventItem, state: CalendarState) => {
    setBusyEventId(event.id)
    try {
      await updateCalendar(event, state)
    } finally {
      setBusyEventId(null)
    }
  }

  return <main className="hub-dashboard">
    <header className="hub-intro">
      <div>
        <span className="hub-eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <h1>Today at Herald</h1>
        <p>{actionCount ? `${actionCount} ${actionCount === 1 ? 'item' : 'items'} to review, with your dates and messages close by.` : 'You’re caught up. Your next dates and messages are below.'}</p>
      </div>
      <button className="hub-ask-button" onClick={() => navigate('Ask AI')}><Sparkles size={17} /> Ask UniSync <ArrowUpRight size={16} /></button>
    </header>

    <div className="hub-overview" aria-label="At a glance">
      <button className="hub-overview-item" onClick={() => navigate(nextDate?.page || 'Calendar')}>
        <span className="hub-overview-icon"><CalendarDays size={18} /></span>
        <span><small>Next on your calendar</small><strong>{nextDate ? formatDate(nextDate.date, { month: 'short', day: 'numeric' }) : 'Nothing scheduled'}</strong><em>{nextDate?.title || 'Your calendar is clear'}</em></span>
        <ArrowUpRight size={16} />
      </button>
      <button className="hub-overview-item" onClick={() => navigate('Notices')}>
        <span className="hub-overview-icon"><Mail size={18} /></span>
        <span><small>College inbox</small><strong>{notices.length} saved {notices.length === 1 ? 'message' : 'messages'}</strong><em>{latestNotices[0]?.title || 'No messages yet'}</em></span>
        <ArrowUpRight size={16} />
      </button>
      <button className="hub-overview-item" onClick={() => navigate('Payments')}>
        <span className="hub-overview-icon"><CreditCard size={18} /></span>
        <span><small>Fees</small><strong>{duePayments.length} to track</strong><em>{duePayments[0] ? `Next: ${duePayments[0].title}` : 'No fees marked due'}</em></span>
        <ArrowUpRight size={16} />
      </button>
    </div>

    <div className="hub-layout">
      <div className="hub-main-column">
        <section className="hub-section hub-attention" aria-labelledby="hub-attention-title">
          <div className="hub-section-heading"><div><span className="hub-eyebrow">TO DO</span><h2 id="hub-attention-title">Needs your attention</h2></div><span className="hub-count">{actionCount}</span></div>
          {actionCount ? <div className="hub-task-list">
            {actionPayment && <article className="hub-task">
              <div className="hub-task-mark fee"><CreditCard size={18} /></div>
              <div className="hub-task-content">
                <span className="hub-task-type">FEE TO TRACK</span>
                <h3>{actionPayment.title}</h3>
                <p>{actionPayment.dueDate < today ? 'Tentative date passed — check the latest college notice.' : `Tentative date ${formatDate(actionPayment.dueDate)} · ${money(actionPayment.amount)}`}</p>
                <div className="hub-task-buttons"><button className="hub-primary-small" onClick={() => onPaymentStatus(actionPayment.id, 'Paid')}>Mark paid by me</button><button onClick={() => navigate('Payments')}>Details <ArrowRight size={14} /></button></div>
                <small>For your own tracking; the college has not confirmed payment.</small>
              </div>
            </article>}
            {pending.slice(0, 2).map(event => <article className="hub-task" key={event.id}>
              <div className="hub-task-mark event"><CalendarDays size={18} /></div>
              <div className="hub-task-content">
                <span className="hub-task-type">CALENDAR DECISION</span>
                <h3>{event.title}</h3>
                <p>{formatDate(event.date)} · {event.category}</p>
                <div className="hub-task-buttons"><button className="hub-primary-small" disabled={busyEventId === event.id} onClick={() => decideCalendar(event, 'Added')}>Add to calendar</button><button disabled={busyEventId === event.id} onClick={() => decideCalendar(event, 'Ignored')}>Ignore</button><button onClick={() => openEventEmail(event)}>Open email <ArrowRight size={14} /></button></div>
              </div>
            </article>)}
            {pending.length > 2 && <button className="hub-text-link" onClick={() => navigate('Notices')}>Review {pending.length - 2} more {pending.length - 2 === 1 ? 'decision' : 'decisions'} <ArrowRight size={14} /></button>}
          </div> : <div className="hub-all-clear"><span><Check size={19} /></span><div><strong>All clear for now</strong><p>Calendar and fee decisions will show up here.</p></div></div>}
        </section>

        <section className="hub-section hub-news" aria-labelledby="hub-news-title">
          <div className="hub-section-heading"><div><span className="hub-eyebrow">FROM COLLEGE</span><h2 id="hub-news-title">Latest messages</h2></div><button className="hub-text-link" onClick={() => navigate('Notices')}>Inbox <ArrowRight size={14} /></button></div>
          {latestNotices.length ? <div className="hub-news-list">{latestNotices.map(notice => <button className="hub-news-row" key={notice.id} onClick={() => onNotice(notice)}>
            <span className="hub-news-icon"><Bell size={17} /></span>
            <span className="hub-news-copy"><span className="hub-news-meta">{notice.category} · {formatDate(notice.date)}{notice.priority === 'High' ? ' · Important' : ''}</span><strong>{notice.title}</strong><small>{notice.summary}</small></span>
            <ChevronRight size={17} />
          </button>)}</div> : <p className="hub-empty">College messages will appear here after sync.</p>}
        </section>
      </div>

      <aside className="hub-side-column" aria-label="Schedule and shortcuts">
        <section className="hub-section hub-schedule" aria-labelledby="hub-schedule-title">
          <div className="hub-section-heading"><div><span className="hub-eyebrow">LOOKING AHEAD</span><h2 id="hub-schedule-title">On your calendar</h2></div><button className="hub-text-link" onClick={() => navigate('Calendar')}>View all <ArrowRight size={14} /></button></div>
          {upcoming.length ? <div className="hub-schedule-list">{upcoming.slice(0, 3).map(event => <button className="hub-schedule-row" key={event.id} onClick={() => navigate('Calendar')}>
            <span className="hub-date-chip"><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><small>{formatDate(event.date, { month: 'short' })}</small></span>
            <span><strong>{event.title}</strong><small>{event.time ? `${event.time} · ` : ''}{event.category}</small></span>
            <ChevronRight size={16} />
          </button>)}</div> : <p className="hub-empty">No upcoming events saved.</p>}
        </section>

        <section className="hub-section hub-tools" aria-labelledby="hub-tools-title">
          <div className="hub-section-heading"><div><span className="hub-eyebrow">QUICK ACCESS</span><h2 id="hub-tools-title">Shortcuts</h2></div></div>
          <div className="hub-tools-list">
            <button onClick={() => navigate('Documents')}><FolderOpen size={19} /><span><strong>Files</strong><small>Find college attachments</small></span><ArrowUpRight size={16} /></button>
            <button onClick={() => navigate('College Email')}><Mail size={19} /><span><strong>Email college</strong><small>Draft a message with AI</small></span><ArrowUpRight size={16} /></button>
            <button onClick={() => navigate('Ask AI')}><Sparkles size={19} /><span><strong>Ask UniSync</strong><small>Get help from your saved records</small></span><ArrowUpRight size={16} /></button>
          </div>
        </section>
      </aside>
    </div>
  </main>
}
