import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  FolderOpen,
  Home,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'

import {
  documents as seedDocuments,
  payments as seedPayments,
  type CalendarState,
  type DocumentItem,
  type EventItem,
  type Notice,
  type Payment,
} from './data'

import {
  studentService,
} from './services/mockService'

import {
  Modal,
  badge,
} from './components/UI'

import Dashboard from './pages/Dashboard'
import Notices from './pages/Notices'
import Events from './pages/Events'
import Calendar from './pages/Calendar'
import Payments from './pages/Payments'
import Documents from './pages/Documents'
import AskAI from './pages/AskAI'
import Profile from './pages/Profile'

type Page =
  | 'Dashboard'
  | 'Notices'
  | 'Events'
  | 'Calendar'
  | 'Payments'
  | 'Documents'
  | 'Ask AI'
  | 'Profile'

const nav: {
  name: Page
  icon: typeof Home
}[] = [
  {
    name: 'Dashboard',
    icon: Home,
  },
  {
    name: 'Notices',
    icon: Bell,
  },
  {
    name: 'Events',
    icon: CalendarDays,
  },
  {
    name: 'Calendar',
    icon: Clock3,
  },
  {
    name: 'Payments',
    icon: CreditCard,
  },
  {
    name: 'Documents',
    icon: FolderOpen,
  },
  {
    name: 'Ask AI',
    icon: Sparkles,
  },
  {
    name: 'Profile',
    icon: Settings2,
  },
]

const initials = 'AM'

export default function App() {
  const [page, setPage] =
    useState<Page>('Dashboard')

  const [menuOpen, setMenuOpen] =
    useState(false)

  const [events, setEvents] =
    useState<EventItem[]>([])

  const [notices, setNotices] =
    useState<Notice[]>([])

  const [loading, setLoading] =
    useState(true)

  const [payments, setPayments] =
    useState<Payment[]>(seedPayments)

  const [documents, setDocuments] =
    useState<DocumentItem[]>(seedDocuments)

  const [toast, setToast] =
    useState('')

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState<EventItem | null>(
    null
  )

  const [
    selectedNotice,
    setSelectedNotice,
  ] = useState<Notice | null>(
    null
  )

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false)

  const [
    globalSearch,
    setGlobalSearch,
  ] = useState('')

  const toastTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        const [
          noticeData,
          eventData,
        ] = await Promise.all([
          studentService.getNotices(),
          studentService.getEvents(),
        ])

        setNotices(noticeData)
        setEvents(eventData)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const notify = (
    message: string
  ) => {
    setToast(message)

    if (toastTimer.current) {
      clearTimeout(
        toastTimer.current
      )
    }

    toastTimer.current =
      setTimeout(
        () => setToast(''),
        4000
      )
  }

  const navigate = (
    target: Page
  ) => {
    setPage(target)
    setMenuOpen(false)
    setSearchOpen(false)
  }

  const updateCalendar =
    async (
      event: EventItem,
      state: CalendarState
    ) => {
      await studentService.updateCalendarState(
        event.id,
        state
      )

      setEvents(previous =>
        previous.map(item =>
          item.id === event.id
            ? {
                ...item,
                calendarState:
                  state,
              }
            : item
        )
      )
    }

  const searchResults =
    useMemo(() => {
      const q =
        globalSearch
          .trim()
          .toLowerCase()

      if (!q) return []

      return [
        ...notices
          .filter(notice =>
            `${notice.title} ${notice.summary}`
              .toLowerCase()
              .includes(q)
          )
          .map(notice => ({
            label:
              notice.title,
            page:
              'Notices' as Page,
          })),

        ...events
          .filter(event =>
            `${event.title} ${event.description}`
              .toLowerCase()
              .includes(q)
          )
          .map(event => ({
            label: event.title,
            page:
              'Events' as Page,
          })),
      ]
    }, [
      globalSearch,
      notices,
      events,
    ])

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          menuOpen
            ? 'is-open'
            : ''
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            H<span>.</span>
          </div>

          <div>
            <strong>
              Heritage
            </strong>

            <small>
              STUDENT SPACE
            </small>
          </div>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="side-nav">
          {nav.map(
            ({
              name,
              icon: Icon,
            }) => (
              <button
                key={name}
                className={`nav-item ${
                  page === name
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  navigate(name)
                }
              >
                <Icon size={18} />

                <span>
                  {name}
                </span>

                {name ===
                  'Notices' &&
                  notices.length >
                    0 && (
                    <em>
                      {
                        notices.length
                      }
                    </em>
                  )}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <BookOpen
              size={17}
            />

            <strong>
              Need help?
            </strong>

            <p>
              Ask about notices
              and deadlines.
            </p>

            <button
              onClick={() =>
                navigate('Ask AI')
              }
            >
              Ask AI
              <ArrowRight
                size={15}
              />
            </button>
          </div>

          <button
            className="sidebar-profile"
            onClick={() =>
              navigate('Profile')
            }
          >
            <span className="avatar">
              {initials}
            </span>

            <span>
              <strong>
                Aashish Mahato
              </strong>

              <small>
                Student
              </small>
            </span>

            <MoreHorizontal
              size={17}
            />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() =>
                setMenuOpen(true)
              }
            >
              <Menu size={21} />
            </button>

            <span className="breadcrumb">
              Workspace
            </span>

            <ChevronRight
              size={15}
            />

            <strong>
              {page}
            </strong>
          </div>

          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() =>
                setSearchOpen(true)
              }
            >
              <Search
                size={17}
              />

              <span>
                Search anything...
              </span>
            </button>

            <button
              className="icon-button"
              onClick={() =>
                navigate(
                  'Notices'
                )
              }
            >
              <Bell size={19} />
            </button>
          </div>
        </header>

        <main className="content">
          {loading ? (
            <div className="panel">
              Loading...
            </div>
          ) : (
            <>
              {page ===
                'Dashboard' && (
                <Dashboard
                  events={events}
                  notices={
                    notices
                  }
                  payments={
                    payments
                  }
                  navigate={
                    navigate
                  }
                  onNotice={
                    setSelectedNotice
                  }
                />
              )}

              {page ===
                'Notices' && (
                <Notices
                  notices={
                    notices
                  }
                  onNotice={
                    setSelectedNotice
                  }
                />
              )}

              {page ===
                'Events' && (
                <Events
                  events={events}
                  onEvent={
                    setSelectedEvent
                  }
                  updateCalendar={
                    updateCalendar
                  }
                />
              )}

              {page ===
                'Calendar' && (
                <Calendar
                  events={events}
                  onEvent={
                    setSelectedEvent
                  }
                  updateCalendar={
                    updateCalendar
                  }
                />
              )}

              {page ===
                'Payments' && (
                <Payments
                  payments={
                    payments
                  }
                  setPayments={
                    setPayments
                  }
                  notify={
                    notify
                  }
                />
              )}

              {page ===
                'Documents' && (
                <Documents
                  documents={
                    documents
                  }
                  setDocuments={
                    setDocuments
                  }
                  notify={
                    notify
                  }
                />
              )}

              {page ===
                'Ask AI' && (
                <AskAI />
              )}

              {page ===
                'Profile' && (
                <Profile
                  notify={
                    notify
                  }
                />
              )}
            </>
          )}
        </main>
      </div>

      {selectedEvent && (
        <Modal
          title="Event details"
          onClose={() =>
            setSelectedEvent(
              null
            )
          }
        >
          <div>
            {badge(
              selectedEvent.category
            )}
            {badge(
              selectedEvent.calendarState
            )}
          </div>

          <h2>
            {
              selectedEvent.title
            }
          </h2>

          <p>
            {
              selectedEvent.description
            }
          </p>

          <button
            className="primary-button"
            onClick={() =>
              updateCalendar(
                selectedEvent,
                'Added'
              )
            }
          >
            <Plus size={16} />
            Add to calendar
          </button>
        </Modal>
      )}

      {selectedNotice && (
        <Modal
          title="Notice"
          onClose={() =>
            setSelectedNotice(
              null
            )
          }
        >
          <div>
            {badge(
              selectedNotice.priority
            )}

            {badge(
              selectedNotice.category
            )}
          </div>

          <h2>
            {
              selectedNotice.title
            }
          </h2>

          <p>
            {
              selectedNotice.summary
            }
          </p>

          <button>
            <ExternalLink
              size={15}
            />
            Original source
          </button>
        </Modal>
      )}

      {searchOpen && (
        <Modal
          title="Search"
          onClose={() =>
            setSearchOpen(false)
          }
        >
          <div className="global-search">
            <Search
              size={19}
            />

            <input
              autoFocus
              value={
                globalSearch
              }
              onChange={e =>
                setGlobalSearch(
                  e.target.value
                )
              }
            />
          </div>

          {searchResults.map(
            (result, index) => (
              <button
                key={index}
                onClick={() =>
                  navigate(
                    result.page
                  )
                }
              >
                {
                  result.label
                }
              </button>
            )
          )}
        </Modal>
      )}

      {toast && (
        <div className="toast">
          <Check size={18} />
          {toast}

          <button
            onClick={() =>
              setToast('')
            }
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}