import { useState } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'

import {
  formatDate,
  today,
  type CalendarState,
  type EventItem,
} from '../data'

import {
  EmptyState,
  PageIntro,
  badge,
} from '../components/UI'

import './Calendar.css'

export default function Calendar({
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
  const now = new Date()

  const [month, setMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  )

  const [selected, setSelected] = useState(today)

  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  ).getDay()

  const days = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate()

  const dateString = (day: number) =>
    `${month.getFullYear()}-${String(
      month.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const selectedEvents = events.filter(
    event =>
      event.date === selected &&
      event.calendarState !== 'Ignored'
  )

  const shift = (amount: number) => {
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + amount,
      1
    )

    setMonth(next)

    setSelected(
      `${next.getFullYear()}-${String(
        next.getMonth() + 1
      ).padStart(2, '0')}-01`
    )
  }

  return (
    <>
      <PageIntro
        title="Calendar"
        copy="Your college events and deadlines in one place."
      />

      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <h2>
              {month.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>

            <div>
              <button
                className="today-button"
                onClick={() => {
                  setMonth(
                    new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1
                    )
                  )

                  setSelected(today)
                }}
              >
                Today
              </button>

              <button
                className="icon-button"
                onClick={() => shift(-1)}
              >
                <ChevronLeft size={19} />
              </button>

              <button
                className="icon-button"
                onClick={() => shift(1)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {[
              'Sun',
              'Mon',
              'Tue',
              'Wed',
              'Thu',
              'Fri',
              'Sat',
            ].map(day => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}

            {Array.from({ length: start }, (_, i) => (
              <div
                key={`blank-${i}`}
                className="calendar-cell blank"
              />
            ))}

            {Array.from({ length: days }, (_, i) => {
              const date = dateString(i + 1)

              const hits = events.filter(
                event =>
                  event.date === date &&
                  event.calendarState !== 'Ignored'
              )

              return (
                <button
                  key={date}
                  className={`calendar-cell ${
                    selected === date ? 'selected' : ''
                  } ${today === date ? 'today' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span>{i + 1}</span>

                  <div className="calendar-dots">
                    {hits.map(event => (
                      <i
                        key={event.id}
                        className={
                          event.calendarState === 'Added'
                            ? 'added'
                            : 'pending'
                        }
                      />
                    ))}
                  </div>

                  {hits[0] && <small>{hits[0].title}</small>}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="panel day-panel">
          <div className="eyebrow">SELECTED DAY</div>

          <h2>
            {formatDate(selected, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h2>

          {selectedEvents.length ? (
            <div className="day-events">
              {selectedEvents.map(event => (
                <div className="day-event" key={event.id}>
                  <div>
                    {badge(event.category)}
                    {badge(event.calendarState === 'Added'
                      ? event.googleCalendarEventId ? 'Synced' : 'Syncing'
                      : event.calendarState)}
                  </div>

                  <h3>{event.title}</h3>

                  <p>
                    {event.time || 'All day'}
                    {event.location && ` · ${event.location}`}
                  </p>

                  <div>
                    <button
                      className="text-link"
                      onClick={() => onEvent(event)}
                    >
                      Details
                      <ArrowRight size={14} />
                    </button>

                    {event.calendarState === 'Pending' && (
                      <button
                        className="text-link"
                        onClick={() =>
                          updateCalendar(event, 'Added')
                        }
                      >
                        Add to calendar
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing scheduled"
              copy="Select another date."
            />
          )}
        </aside>
      </div>
    </>
  )
}