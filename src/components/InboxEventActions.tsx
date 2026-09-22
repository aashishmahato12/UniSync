import { CalendarPlus, Check, RotateCcw, X } from 'lucide-react'
import { formatDate, type CalendarState, type EventItem, type Notice } from '../data'
import './InboxEventActions.css'

export default function InboxEventActions({ notice, events, updateCalendar }: {
  notice: Notice
  events: EventItem[]
  updateCalendar: (event: EventItem, state: CalendarState) => void | Promise<void>
}) {
  const related = events.filter(event => event.gmailMessageId && event.gmailMessageId === notice.gmailMessageId)
  if (!related.length) return null
  return <section className="inbox-event-actions">
    <header><span><CalendarPlus size={17} /></span><div><small>DATES FROM THIS EMAIL</small><h3>Add to calendar</h3></div></header>
    <div>{related.map(event => <article key={event.id}>
      <time><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><span>{formatDate(event.date, { month: 'short' }).toUpperCase()}</span></time>
      <div><strong>{event.title}</strong><small>{formatDate(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}{event.time ? ` · ${event.time}` : ''}{event.location ? ` · ${event.location}` : ''}</small></div>
      <div className="inbox-event-controls">{event.calendarState === 'Pending' ? <>
        <button type="button" onClick={() => void updateCalendar(event, 'Ignored')}><X size={14} /> Ignore</button>
        <button type="button" className="primary" onClick={() => void updateCalendar(event, 'Added')}><CalendarPlus size={14} /> Add</button>
      </> : event.calendarState === 'Added' ? <span className="added"><Check size={14} /> Added</span> : <button type="button" onClick={() => void updateCalendar(event, 'Pending')}><RotateCcw size={14} /> Restore</button>}</div>
    </article>)}</div>
  </section>
}
