import { useMemo, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, CreditCard, GraduationCap, MapPin, Plus, Sparkles, Sun, UsersRound } from 'lucide-react'
import { formatDate, today, type CalendarState, type CustomEventInput, type EventItem } from '../data'
import JellyRadio from '../components/JellyRadio'
import { Modal } from '../components/UI'
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
const calendarJellyDamping = 2 * Math.sqrt(460 * .9) * (1 - .3)
const calendarJellySpring = { type: 'spring' as const, stiffness: 460, damping: calendarJellyDamping, mass: .9 }
const calendarEntry = (index = 0) => {
  const delay = Math.min(index, 8) * .055
  return {
    scaleX: { ...calendarJellySpring, stiffness: 460 * 1.24, damping: calendarJellyDamping * .75, delay },
    scaleY: { ...calendarJellySpring, stiffness: 460 * .86, damping: calendarJellyDamping * .85, delay: delay + .05 },
    opacity: { duration: .24, delay },
  }
}

export default function Calendar({ events, onEvent, updateCalendar, createEvent }: {
  events: EventItem[]
  onEvent: (event: EventItem) => void
  updateCalendar: (event: EventItem, state: CalendarState) => void
  createEvent: (input: CustomEventInput) => Promise<EventItem>
}) {
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState<'month' | 'day'>('month')
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('All')
  const [composerOpen, setComposerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [draft, setDraft] = useState<CustomEventInput>({ title: '', date: today, category: 'College event', time: '', location: '', description: '' })
  const reduceMotion = useReducedMotion()
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
  const openComposer = () => {
    setDraft({ title: '', date: selected || today, category: 'College event', time: '', location: '', description: '' })
    setFormError('')
    setComposerOpen(true)
  }
  const submitEvent = async (submit: FormEvent) => {
    submit.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await createEvent(draft)
      setSelected(draft.date)
      setComposerOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not add this event.')
    } finally {
      setSaving(false)
    }
  }

  const eventCard = (event: EventItem, compact = false, index = 0) => <motion.article
    className={`uni-cal-event uni-cal-${tone(event)} ${compact ? 'is-compact' : 'is-expanded'}`}
    key={`${filter}-${view}-${event.id}`}
    initial={reduceMotion ? false : { opacity: .2, scaleX: .93, scaleY: 1.07 }}
    animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
    transition={reduceMotion ? { duration: 0 } : calendarEntry(index + 3)}
  >
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
        {event.calendarState === 'Added' && <span>{event.isCustom ? 'Added by you' : event.googleCalendarEventId ? 'Synced to calendar' : 'Added · syncing'}</span>}
      </div>
    </div>}
  </motion.article>

  return <div className={`uni-calendar uni-calendar-${view}`}>
    <motion.header className="uni-cal-heading" initial={reduceMotion ? false : { opacity: 0, scaleX: .96, scaleY: 1.04 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} transition={reduceMotion ? { duration: 0 } : calendarEntry(0)}><div><small>YOUR SCHEDULE</small><h1>Calendar</h1><p>Classes, college events and deadlines in one place.</p></div><button className="uni-cal-add" onClick={openComposer}><Plus size={16} /> Add event</button></motion.header>
    <motion.div initial={reduceMotion ? false : { opacity: 0, scaleX: .96, scaleY: 1.04 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} transition={reduceMotion ? { duration: 0 } : calendarEntry(1)}><JellyRadio items={calendarFilters} value={filter} onChange={changeFilter} toneForItem={item => filterTone[item] || 'all'} ariaLabel="Filter calendar dates" className="uni-cal-filters" /></motion.div>
    <div className="uni-cal-layout">
      <motion.section className="uni-cal-main" initial={reduceMotion ? false : { opacity: 0, scaleX: .96, scaleY: 1.04 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} transition={reduceMotion ? { duration: 0 } : calendarEntry(2)}>
        <div className="uni-cal-toolbar">
          <div className="uni-cal-title">{view === 'day' && <button className="uni-cal-round" onClick={() => setView('month')} aria-label="Back to month"><ArrowLeft size={17} /></button>}<h2>{view === 'day' ? formatDate(selected, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2></div>
          <div className="uni-cal-controls"><button className="uni-cal-add-mobile" onClick={openComposer} aria-label="Add event"><Plus size={15} /></button><button className="uni-cal-today" onClick={() => setSelected(today)}>Today</button><button className="uni-cal-round" onClick={() => shift(-1)} aria-label={view === 'day' ? 'Previous day' : 'Previous month'}><ChevronLeft size={15} /></button><button className="uni-cal-round" onClick={() => shift(1)} aria-label={view === 'day' ? 'Next day' : 'Next month'}><ChevronRight size={15} /></button></div>
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
          {selectedEvents.length ? <div className="uni-cal-events">{selectedEvents.map((event, index) => eventCard(event, true, index))}</div> : <div className="uni-cal-empty"><Sparkles size={16} /> {filter === 'All' ? 'No events scheduled. Your day is clear.' : `No ${filter.toLowerCase()} on this day.`}</div>}
        </> : <div className="uni-cal-day-content">{selectedEvents.length ? <div className="uni-cal-events">{selectedEvents.map((event, index) => eventCard(event, false, index))}</div> : <div className="uni-cal-day-empty"><CalendarDays size={25} /><h3>{filter === 'All' ? 'Nothing on your schedule' : `No ${filter.toLowerCase()} on this day`}</h3><p>Choose another day or see what’s coming up below.</p></div>}</div>}
      </motion.section>
      <motion.aside className="uni-cal-side" initial={reduceMotion ? false : { opacity: 0, scaleX: .96, scaleY: 1.04 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} transition={reduceMotion ? { duration: 0 } : calendarEntry(3)}>
        <div className="uni-cal-upcoming-head"><h2>Upcoming</h2><button onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : 'View all'} <ChevronRight size={13} /></button></div>
        {upcoming.length ? <div className="uni-cal-upcoming-list">{upcoming.slice(0, showAll ? undefined : 5).map((event, index) => {
          const distance = Math.round((parsed(event.date).getTime() - date.getTime()) / 86400000)
          return <motion.button className={`uni-cal-upcoming uni-cal-${tone(event)}`} key={`${filter}-${event.id}`} onClick={() => choose(event.date)} initial={reduceMotion ? false : { opacity: .2, scaleX: .93, scaleY: 1.07 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} transition={reduceMotion ? { duration: 0 } : calendarEntry(index + 4)}>
            <span className="uni-cal-upcoming-date"><EventIcon event={event} /><small>{formatDate(event.date, { month:'short' }).toUpperCase()}</small><strong>{formatDate(event.date, { day:'2-digit' })}</strong></span>
            <span className="uni-cal-upcoming-copy"><small>{distance === 1 ? 'Tomorrow' : `In ${distance} days`}</small><strong>{event.title}</strong><em>{event.category}</em></span>
          </motion.button>
        })}</div> : <p className="uni-cal-no-upcoming">{filter === 'All' ? 'No later events on your schedule.' : `No upcoming ${filter.toLowerCase()}.`}</p>}
      </motion.aside>
    </div>
    {composerOpen && <Modal title="Add an event" className="calendar-event-modal" onClose={() => !saving && setComposerOpen(false)}>
      <form className="calendar-event-form" onSubmit={submitEvent}>
        <label className="calendar-event-wide"><span>Event title</span><input autoFocus required maxLength={160} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="What is happening?" /></label>
        <label><span>Date</span><input required type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} /></label>
        <label><span>Time <em>Optional</em></span><input type="time" value={draft.time || ''} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} /></label>
        <label><span>Type</span><select value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value as CustomEventInput['category'] }))}><option>College event</option><option>Deadline</option><option>Exam</option><option>Holiday</option></select></label>
        <label><span>Location <em>Optional</em></span><input maxLength={180} value={draft.location || ''} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} placeholder="Room or place" /></label>
        <label className="calendar-event-wide"><span>Notes <em>Optional</em></span><textarea maxLength={1200} rows={3} value={draft.description || ''} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Anything you want to remember" /></label>
        {formError && <p className="calendar-event-error" role="alert">{formError}</p>}
        <div className="calendar-event-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setComposerOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving || !draft.title.trim() || !draft.date}><Plus size={15} /> {saving ? 'Adding…' : 'Add event'}</button></div>
      </form>
    </Modal>}
  </div>
}
