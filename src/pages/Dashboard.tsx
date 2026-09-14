import './DashboardLayout.css'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { formatDate, money, today, type CalendarState, type EventItem, type Notice, type Payment } from '../data'

type Page = 'Dashboard' | 'Notices' | 'Events' | 'Calendar' | 'Payments' | 'Documents' | 'Ask AI' | 'Profile'

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
  const decideCalendar = async (event: EventItem, state: CalendarState) => {
    setBusyEventId(event.id)
    try {
      await updateCalendar(event, state)
    } finally {
      setBusyEventId(null)
    }
  }
  const upcoming = events
    .filter(event => event.date >= today && event.calendarState !== 'Ignored')
    .sort((a, b) => a.date.localeCompare(b.date))
  const pending = upcoming.filter(event => event.calendarState === 'Pending')
  const duePayments = payments
    .filter(payment => payment.status === 'Due' && payment.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const actionPayment = duePayments.find(payment => payment.dueDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const importantNotice = notices.find(notice => notice.priority === 'High' && (!actionPayment || notice.category !== 'Payments'))
    || notices.find(notice => notice.priority === 'High')
  const actionCount = pending.length + (actionPayment ? 1 : 0)
  const weekEnd = new Date(`${today}T12:00:00`)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndDate = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
  const weekStart = new Date(`${today}T12:00:00`)
  weekStart.setDate(weekStart.getDate() - 7)
  const weekStartDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
  const todayEvents = upcoming.filter(event => event.date === today)
  const nearPayment = duePayments.find(payment => payment.dueDate <= weekEndDate)
  const recentImportant = notices.find(notice => notice.priority === 'High' && notice.date >= weekStartDate && notice.summary && (!nearPayment || notice.category !== 'Payments') && !/notice is in an attachment/i.test(notice.summary))
  const briefLead = todayEvents.length
    ? `${todayEvents.length === 1 ? todayEvents[0].title : `${todayEvents.length} events`} ${todayEvents.length === 1 ? 'is' : 'are'} on your schedule today${todayEvents.length === 1 && todayEvents[0].time ? ` at ${todayEvents[0].time}` : ''}.`
    : nearPayment
      ? `${nearPayment.title} payment (${money(nearPayment.amount)}) is marked due${nearPayment.dueDate < today ? ' after its tentative date' : ` on the tentative ${formatDate(nearPayment.dueDate)} date`}.`
      : upcoming[0] ? `Next up: ${upcoming[0].title} on ${formatDate(upcoming[0].date)}.` : ''
  const briefFollow = recentImportant
    ? `${recentImportant.title}: ${recentImportant.summary.split(/(?<=[.!?])\s+/)[0]}`
    : pending.length ? `${pending.length} calendar ${pending.length === 1 ? 'decision needs' : 'decisions need'} your review.` : ''
  const briefText = [briefLead, briefFollow].filter(Boolean).join(' ') || 'No new deadlines or important updates are saved for today.'
  const nextDates = [
    ...upcoming.map(event => ({ date: event.date, title: event.title, page: 'Events' as Page })),
    ...duePayments.filter(payment => payment.dueDate >= today).map(payment => ({ date: payment.dueDate, title: `${payment.title} · tentative fee date`, page: 'Payments' as Page })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const nextDate = nextDates[0]

  return <div className="desk-dashboard">
    <header className="desk-heading">
      <div>
        <span className="desk-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span>
        <h1>Good to see you, Aashish.</h1>
        <p>Here’s what needs attention across your Herald College space.</p>
      </div>
      <button className="desk-calendar-button" onClick={() => navigate('Calendar')}><CalendarDays size={17} /> Open calendar <ArrowUpRight size={15} /></button>
    </header>

    <div className="desk-lead-grid">
      <section className="desk-brief" aria-labelledby="desk-brief-title">
        <div className="desk-brief-top"><span className="desk-brief-icon"><Sparkles size={18} /></span><span>YOUR DAILY BRIEF · SAVED RECORDS</span></div>
        <h2 id="desk-brief-title">Here’s your day.</h2>
        <p>{briefText}</p>
        <button onClick={() => navigate('Ask AI')}>Explore with Ask AI <ArrowUpRight size={16} /></button>
      </section>
      <button className="desk-next" onClick={() => navigate(nextDate?.page || 'Calendar')}>
        <span className="desk-next-top"><span><Clock3 size={16} /> UP NEXT</span><ArrowUpRight size={17} /></span>
        <strong>{nextDate ? formatDate(nextDate.date, { weekday: 'short', month: 'short', day: 'numeric' }) : 'All clear'}</strong>
        <span className="desk-next-title">{nextDate?.title || 'No upcoming dates saved'}</span>
        <span className="desk-next-footer">View your schedule <ArrowRight size={15} /></span>
      </button>
    </div>

    <div className="desk-signal-row" aria-label="Workspace snapshot">
      <button onClick={() => navigate('Events')}><span className="desk-signal-icon blue"><CalendarDays size={17} /></span><strong>{pending.length}</strong><span>Calendar {pending.length === 1 ? 'decision' : 'decisions'}</span><ArrowUpRight size={15} /></button>
      <button onClick={() => navigate('Payments')}><span className="desk-signal-icon coral"><CreditCard size={17} /></span><strong>{duePayments.length}</strong><span>Fees marked due</span><ArrowUpRight size={15} /></button>
      <button onClick={() => navigate('Notices')}><span className="desk-signal-icon violet"><Bell size={17} /></span><strong>{notices.length}</strong><span>Saved notices</span><ArrowUpRight size={15} /></button>
    </div>

    <div className="desk-main-grid">
      <section className="desk-panel desk-actions">
        <div className="desk-section-head"><div><span>TAKE ACTION</span><h2>Decisions waiting for you</h2></div><b>{actionCount}</b></div>
        {actionCount ? <div className="desk-action-list">
          {actionPayment && <div className="desk-action">
            <span className="desk-action-icon coral"><CreditCard size={18} /></span>
            <div className="desk-action-body"><strong>{actionPayment.title}</strong><small>{actionPayment.dueDate < today ? 'Tentative date passed — check the latest notice' : `Tentative date ${formatDate(actionPayment.dueDate)} · ${money(actionPayment.amount)}`}</small>
              <div className="desk-action-controls"><button className="primary" onClick={() => onPaymentStatus(actionPayment.id, 'Paid')}>Mark paid by me</button><button onClick={() => navigate('Payments')}>Fee details <ArrowUpRight size={13} /></button></div>
              <small>Personal tracking; the college has not confirmed this payment.</small>
            </div>
          </div>}
          {pending.slice(0, 2).map(event => <div className="desk-action" key={event.id}>
            <span className="desk-action-icon blue"><CalendarDays size={18} /></span>
            <div className="desk-action-body"><strong>{event.title}</strong><small>{formatDate(event.date)} · {event.category}</small>
              <div className="desk-action-controls"><button className="primary" disabled={busyEventId === event.id} onClick={() => decideCalendar(event, 'Added')}>Approve for calendar</button><button disabled={busyEventId === event.id} onClick={() => decideCalendar(event, 'Ignored')}>Ignore</button><button onClick={() => navigate('Events')}>Details <ArrowUpRight size={13} /></button></div>
            </div>
          </div>)}
          {pending.length > 2 && <button className="desk-more" onClick={() => navigate('Events')}>Review {pending.length - 2} more calendar {pending.length - 2 === 1 ? 'approval' : 'approvals'} <ArrowRight size={14} /></button>}
        </div> : <div className="desk-clear"><CheckCircle2 size={22} /><strong>Nothing to approve right now</strong><span>New payment and calendar decisions will appear here.</span></div>}
      </section>

      <section className="desk-panel desk-important">
        <div className="desk-section-head"><div><span>IMPORTANT</span><h2>From the college</h2></div><Bell size={18} /></div>
        {importantNotice ? <>
          <span className="desk-important-tag">HIGH PRIORITY · {formatDate(importantNotice.date)}</span>
          <h3>{importantNotice.title}</h3>
          <p>{importantNotice.summary}</p>
          <button onClick={() => onNotice(importantNotice)}>Read notice <ArrowUpRight size={15} /></button>
        </> : <div className="desk-clear compact"><CheckCircle2 size={22} /><strong>No high-priority notices</strong><span>Check Notices for all college updates.</span></div>}
      </section>
      <section className="desk-panel desk-upcoming">
        <div className="desk-section-head"><div><span>YOUR SCHEDULE</span><h2>Coming up</h2></div><button onClick={() => navigate('Events')}>All events <ArrowRight size={14} /></button></div>
        {upcoming.length ? <div className="desk-upcoming-list">{upcoming.slice(0, 4).map(event => <button className="desk-upcoming-row" key={event.id} onClick={() => navigate('Events')}>
          <span className="desk-date-tile"><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><small>{formatDate(event.date, { month: 'short' }).toUpperCase()}</small></span>
          <span><strong>{event.title}</strong><small>{event.time ? `${event.time} · ` : ''}{event.category}</small></span>
          <em className={event.calendarState.toLowerCase()}>{event.calendarState}</em><ChevronRight size={16} />
        </button>)}</div> : <div className="desk-empty">No upcoming events yet.</div>}
      </section>

      <section className="desk-panel desk-notices">
        <div className="desk-section-head"><div><span>RECENT NOTICES</span><h2>Latest from your inbox</h2></div><button onClick={() => navigate('Notices')}>All notices <ArrowRight size={14} /></button></div>
        {notices.length ? <div className="desk-notice-list">{notices.slice(0, 3).map(notice => <button className="desk-notice-row" key={notice.id} onClick={() => onNotice(notice)}>
          <span className="desk-notice-meta">{notice.category} · {formatDate(notice.date)} {notice.priority === 'High' && <b>IMPORTANT</b>}</span>
          <strong>{notice.title}</strong>
          <small>{notice.summary}</small>
        </button>)}</div> : <div className="desk-empty">College emails will appear here after sync.</div>}
      </section>
    </div>

  </div>
}
