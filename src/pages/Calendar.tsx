import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, CreditCard, GraduationCap, MapPin, Plus, Sparkles, Sun, UsersRound } from 'lucide-react'
import { formatDate, today, type CalendarState, type EventItem } from '../data'
import JellyRadio from '../components/JellyRadio'
import './Calendar.css'

const parsed = (value: string) => new Date(`${value}T12:00:00`)
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const isPaymentDeadline = (event: EventItem) =>
  event.category === 'Deadline' && /\b(fee|fees|payment|pay|tuition|invoice|receipt)\b/i.test(event.title)
const tone = (event: EventItem) =>
  isPaymentDeadline(event) ? 'payment' : event.category === 'Deadline' ? 'deadline' : event.category === 'Exam' ? 'exam' : event.category === 'Holiday' ? 'holiday' : 'event'
const EventIcon = ({ event }: { event: EventItem }) => {
  const Icon = isPaymentDeadline(event) ? CreditCard : event.category === 'Exam' ? GraduationCap : event.category === 'Deadline' ? Clock3 : event.category === 'Holiday' ? Sun : UsersRound
  return <Icon size={19} strokeWidth={2.3} />
}
const calendarFilters = ['All', 'Payments', 'Exams', 'Deadlines', 'Events', 'Holidays']
const filterTone: Record<string, string> = {
  Payments: 'payment',
  Exams: 'exam',
  Deadlines: 'deadline',
  Events: 'event',
  Holidays: 'holiday',
}

export default function Calendar({ events, onEvent, updateCalendar }: {
  events: EventItem[]
  onEvent: (event: EventItem) => void
  updateCalendar: (event: EventItem, state: CalendarState) => void
}) {
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState<'month' | 'day'>('month')
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('All')
  const date = parsed(selected)
  const month = new Date(date.getFullYear(), date.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const active = useMemo(() => events.filter(event => event.calendarState !== 'Ignored'), [events])
  const visibleEvents = active.filter(event => filter === 'All' || tone(event) === filterTone[filter])
  const selectedEvents = visibleEvents.filter(event => event.date === selected)
  const upcoming = visibleEvents.filter(event => event.date > selected).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  const changeFilter = (value: string) => {
    setFilter(value)
    setShowAll(false)
  }
  const shift = (amount: number) => {
    const next = view === 'day' ? parsed(selected) : new Date(month)
    if (view === 'day') next.setDate(next.getDate() + amount)
    else next.setMonth(next.getMonth() + amount)
    setSelected(key(next))
  }
  const choose = (value: string) => { setSelected(value); setView('day') }

  const eventCard = (event: EventItem, compact = false) => <article className={`uni-cal-event uni-cal-${tone(event)} ${compact ? 'is-compact' : 'is-expanded'}`} key={event.id}>
    <button className="uni-cal-event-main" onClick={() => compact ? choose(event.date) : onEvent(event)} aria-label={`View ${event.title}`}>
      <span className="uni-cal-event-icon"><EventIcon event={event} /></span>
      <span className="uni-cal-event-copy"><strong>{event.title}</strong><small>{event.location || event.source}</small></span>
      <span className="uni-cal-event-meta"><em>{isPaymentDeadline(event) ? 'Payment' : event.category === 'College event' ? 'Event' : event.category}</em><time>{event.time || 'All day'}</time></span>
      <ChevronRight size={15} />
    </button>
    {!compact && event.time && <div className="uni-cal-time-band">
      <div><span><Clock3 size={12} /> Starts</span><strong>{event.time}</strong></div>
      <div><span>{event.location ? <MapPin size={12} /> : <CalendarDays size={12} />}{event.location ? ' Location' : ' Schedule'}</span><strong>{event.location || 'College event'}</strong></div>
      <i aria-hidden="true" />
    </div>}
    {!compact && <div className="uni-cal-event-more">
      <p>{event.description}</p>
      <div><button onClick={() => onEvent(event)}>View details <ArrowRight size={13} /></button>
        {event.calendarState === 'Pending' && <button onClick={() => updateCalendar(event, 'Added')}><Plus size={13} /> Add to calendar</button>}
        {event.calendarState === 'Added' && <span>{event.googleCalendarEventId ? 'Synced to calendar' : 'Added · syncing'}</span>}
      </div>
    </div>}
  </article>

  return <div className={`uni-calendar uni-calendar-${view}`}>
    <header className="uni-cal-heading"><div><small>YOUR SCHEDULE</small><h1>Calendar</h1><p>Classes, college events and deadlines in one place.</p></div><CalendarDays size={23} /></header>
    <JellyRadio items={calendarFilters} value={filter} onChange={changeFilter} toneForItem={item => filterTone[item] || 'all'} ariaLabel="Filter calendar dates" className="uni-cal-filters" />
    <div className="uni-cal-layout">
      <section className="uni-cal-main">
        <div className="uni-cal-toolbar">
          <div className="uni-cal-title">{view === 'day' && <button className="uni-cal-round" onClick={() => setView('month')} aria-label="Back to month"><ArrowLeft size={17} /></button>}<h2>{view === 'day' ? formatDate(selected, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2></div>
          <div className="uni-cal-controls"><button className="uni-cal-today" onClick={() => setSelected(today)}>Today</button><button className="uni-cal-round" onClick={() => shift(-1)} aria-label={view === 'day' ? 'Previous day' : 'Previous month'}><ChevronLeft size={15} /></button><button className="uni-cal-round" onClick={() => shift(1)} aria-label={view === 'day' ? 'Next day' : 'Next month'}><ChevronRight size={15} /></button></div>
        </div>
        {view === 'month' ? <>
          <div className="uni-cal-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span className="uni-cal-weekday" key={day}>{day}</span>)}
            {Array.from({ length: month.getDay() }, (_, i) => <span key={`blank-${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const value = key(new Date(month.getFullYear(), month.getMonth(), i + 1))
              const hits = visibleEvents.filter(event => event.date === value)
              return <button key={value} className={`uni-cal-date ${selected === value ? 'is-selected' : ''} ${today === value ? 'is-today' : ''}`} onClick={() => setSelected(value)} onDoubleClick={() => choose(value)} aria-pressed={selected === value} aria-label={`${formatDate(value, { month:'long', day:'numeric' })}, ${hits.length} events`}><span>{i + 1}</span>{hits.length > 0 && <i className={`uni-cal-dot uni-cal-${tone(hits[0])}`} />}</button>
            })}
          </div>
          <div className="uni-cal-selected-head"><strong>{formatDate(selected, { weekday:'short', month:'short', day:'numeric', year:'numeric' })}{selected === today ? ' · Today' : ''}</strong><button onClick={() => setView('day')}>Detail view <ChevronRight size={14} /></button></div>
          {selectedEvents.length ? <div className="uni-cal-events">{selectedEvents.map(event => eventCard(event, true))}</div> : <div className="uni-cal-empty"><Sparkles size={16} /> {filter === 'All' ? 'No events scheduled. Your day is clear.' : `No ${filter.toLowerCase()} on this day.`}</div>}
        </> : <div className="uni-cal-day-content">{selectedEvents.length ? <div className="uni-cal-events">{selectedEvents.map(event => eventCard(event))}</div> : <div className="uni-cal-day-empty"><CalendarDays size={25} /><h3>{filter === 'All' ? 'Nothing on your schedule' : `No ${filter.toLowerCase()} on this day`}</h3><p>Choose another day or see what’s coming up below.</p></div>}</div>}
      </section>
      <aside className="uni-cal-side">
        <div className="uni-cal-upcoming-head"><h2>Upcoming</h2><button onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : 'View all'} <ChevronRight size={13} /></button></div>
        {upcoming.length ? <div className="uni-cal-upcoming-list">{upcoming.slice(0, showAll ? undefined : 5).map(event => {
          const distance = Math.round((parsed(event.date).getTime() - date.getTime()) / 86400000)
          return <button className={`uni-cal-upcoming uni-cal-${tone(event)}`} key={event.id} onClick={() => choose(event.date)}>
            <span className="uni-cal-upcoming-date"><EventIcon event={event} /><small>{formatDate(event.date, { month:'short' }).toUpperCase()}</small><strong>{formatDate(event.date, { day:'2-digit' })}</strong></span>
            <span className="uni-cal-upcoming-copy"><small>{distance === 1 ? 'Tomorrow' : `In ${distance} days`}</small><strong>{event.title}</strong><em>{event.category}</em></span>
          </button>
        })}</div> : <p className="uni-cal-no-upcoming">{filter === 'All' ? 'No later events on your schedule.' : `No upcoming ${filter.toLowerCase()}.`}</p>}
      </aside>
    </div>
  </div>
}
