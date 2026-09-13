import './Events.css'
import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ExternalLink,
  Plus,
} from 'lucide-react'

import {
  formatDate,
  type CalendarState,
  type EventItem,
} from '../data'

import {
  EmptyState,
  PageIntro,
  badge,
} from '../components/UI'

export default function Events({
  events,
  onEvent,
  updateCalendar,
}: {
  events: EventItem[]
  onEvent: (event: EventItem) => void
  updateCalendar: (
    event: EventItem,
    state: CalendarState
  ) => void
}) {
  const [filter, setFilter] = useState('All')
  const [stateFilter, setStateFilter] =
    useState('All states')

  const categories = [
    'All',
    'Exam',
    'Deadline',
    'College event',
    'Holiday',
  ]

  const filtered = events
    .filter(
      event =>
        (filter === 'All' ||
          event.category === filter) &&
        (stateFilter === 'All states' ||
          event.calendarState === stateFilter)
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <PageIntro
        title="Events & deadlines"
        copy="Review detected dates and decide what belongs on your calendar."
      />

      <div className="page-toolbar">
        <div className="tab-filters">
          {categories.map(category => (
            <button
              key={category}
              className={
                filter === category ? 'selected' : ''
              }
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <label className="select-wrap">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
          >
            <option>All states</option>
            <option>Pending</option>
            <option>Added</option>
            <option>Ignored</option>
          </select>

          <ChevronDown size={15} />
        </label>
      </div>

      <div className="event-list">
        {filtered.length ? (
          filtered.map(event => (
            <article className="event-card" key={event.id}>
              <div className="event-date">
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

              <div className="event-info">
                <div className="event-badges">
                  {badge(event.category)}
                  {badge(event.calendarState === 'Added'
                    ? event.googleCalendarEventId ? 'Synced' : 'Syncing'
                    : event.calendarState)}
                </div>

                <h3>{event.title}</h3>

                <p>
                  {formatDate(event.date, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}

                  {event.time && ` · ${event.time}`}
                  {event.location && ` · ${event.location}`}
                </p>

                <span>{event.description}</span>
              </div>

              <div className="event-actions">
                <button
                  className="text-link"
                  onClick={() => onEvent(event)}
                >
                  View source
                  <ExternalLink size={15} />
                </button>

                {event.calendarState === 'Pending' ? (
                  <div className="event-approval-actions">
                    <button
                      className="secondary-button"
                      onClick={() => updateCalendar(event, 'Ignored')}
                    >
                      Ignore
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => updateCalendar(event, 'Added')}
                    >
                      <Plus size={16} />
                      Add to calendar
                    </button>
                  </div>
                ) : event.calendarState === 'Added' ? (
                  event.googleCalendarEventId ? (
                    <a className="secondary-button" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer">
                      <Check size={16} />
                      In Google Calendar
                    </a>
                  ) : (
                    <span className="secondary-button" role="status">
                      Approved · waiting to sync
                    </span>
                  )
                ) : (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      updateCalendar(event, 'Pending')
                    }
                  >
                    Restore
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="No events"
            copy="Detected events will appear here."
          />
        )}
      </div>
    </>
  )
}