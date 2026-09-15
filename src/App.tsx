import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  FolderOpen,
  Home,
  Menu,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'

import {
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
import { loadPaymentStatuses, savePaymentStatuses } from './services/paymentStatusStore'
import { gmailUrlForNotice } from './services/gmailLinks'
import Documents from './pages/Documents'
import AskAI from './pages/AskAI'
import Profile from './pages/Profile'
import AuthGate from './components/AuthGate'

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

type Theme = 'light' | 'dark'
type ThemeMode = Theme | 'system'

const initialThemeMode = (): ThemeMode => {
  const saved = localStorage.getItem('unisync-theme-mode')
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode)
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  const theme: Theme = themeMode === 'system' ? systemTheme : themeMode

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = (event: MediaQueryListEvent | MediaQueryList) =>
      setSystemTheme(event.matches ? 'dark' : 'light')
    updateSystemTheme(media)
    media.addEventListener('change', updateSystemTheme)
    return () => media.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    localStorage.setItem('unisync-theme-mode', themeMode)
  }, [themeMode])

  const toggleTheme = () => setThemeMode(theme === 'dark' ? 'light' : 'dark')

  return <AuthGate>{email => <Workspace email={email} theme={theme} themeMode={themeMode} setThemeMode={setThemeMode} toggleTheme={toggleTheme} />}</AuthGate>
}

function WorkspaceSkeleton() {
  return <div className="workspace-skeleton" aria-hidden="true">
    <div className="skel-heading">
      <span className="skel-line short" />
      <span className="skel-line title" />
      <span className="skel-line medium" />
    </div>
    <div className="skel-lead">
      <span className="skel-card hero" />
      <span className="skel-card side" />
    </div>
    <div className="skel-stats">
      <span className="skel-card" />
      <span className="skel-card" />
      <span className="skel-card" />
    </div>
    <div className="skel-content-grid">
      <span className="skel-card tall" />
      <span className="skel-card tall" />
      <span className="skel-card medium-card" />
      <span className="skel-card medium-card" />
    </div>
  </div>
}

function Workspace({ email, theme, themeMode, setThemeMode, toggleTheme }: { email: string; theme: Theme; themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void; toggleTheme: () => void }) {
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
    useState<Payment[]>(() => loadPaymentStatuses(seedPayments))

  useEffect(() => {
    savePaymentStatuses(payments)
  }, [payments])

  const [documents, setDocuments] =
    useState<DocumentItem[]>([])

  const [documentsError, setDocumentsError] = useState(false)

  const [toasts, setToasts] = useState<{
    id: number
    message: string
    entering?: boolean
    leaving?: boolean
  }[]>([])

  const [toastSpread, setToastSpread] = useState(false)

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

  const toastId = useRef(0)
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

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
        void studentService.getDocuments(noticeData)
          .then(files => { setDocuments(files); setDocumentsError(false) })
          .catch(error => { console.error('Could not load documents:', error); setDocumentsError(true) })
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void studentService.getEvents()
        .then(setEvents)
        .catch(error => console.error('Could not refresh events:', error))
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])

  const openDocument = async (file: DocumentItem) => {
    const tab = window.open('about:blank', '_blank')
    try {
      const url = await studentService.openDocument(file)
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (error) {
      tab?.close()
      console.error('Could not open document:', error)
      notify('Could not open this file. Please try again.')
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void studentService.getNotices()
        .then(latest => {
          setNotices(latest)
          return studentService.getDocuments(latest)
        })
        .then(files => { setDocuments(files); setDocumentsError(false) })
        .catch(error => { console.error('Could not refresh notices or documents:', error) })
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const dismissToast = (id: number) => {
    const existingTimer = toastTimers.current.get(id)
    if (existingTimer) clearTimeout(existingTimer)
    toastTimers.current.delete(id)
    setToasts(current => current.map(item => item.id === id ? { ...item, leaving: true } : item))
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 250)
  }

  const notify = (message: string) => {
    const id = ++toastId.current
    setToasts(current => [{ id, message, entering: true }, ...current.map(item => ({ ...item, entering: false }))])
    requestAnimationFrame(() => setToasts(current => current.map(item => item.id === id ? { ...item, entering: false } : item)))
    toastTimers.current.set(id, window.setTimeout(() => dismissToast(id), 4000))
  }

  useEffect(() => {
    if (toasts.length <= 3) return
    const overflowIds = new Set(toasts.slice(3).map(item => item.id))
    setToasts(current => current.map(item => overflowIds.has(item.id) ? { ...item, leaving: true } : item))
    const timer = window.setTimeout(() => setToasts(current => current.filter(item => !overflowIds.has(item.id))), 250)
    return () => window.clearTimeout(timer)
  }, [toasts.length])

  useEffect(() => () => {
    toastTimers.current.forEach(timer => clearTimeout(timer))
    toastTimers.current.clear()
  }, [])

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
      try {
        await studentService.updateCalendarState(event.id, state)
        setEvents(previous =>
          previous.map(item =>
            item.id === event.id
              ? { ...item, calendarState: state }
              : item
          )
        )
        setSelectedEvent(null)
        notify(state === 'Added'
          ? 'Approved. Google Calendar will update after sync.'
          : 'Calendar preference saved.')
      } catch (error) {
        console.error(error)
        notify('Could not save this event. Please try again.')
      }
    }

  const updatePaymentStatus = (id: string, status: 'Due' | 'Paid') => {
    setPayments(current => current.map(payment =>
      payment.id === id ? { ...payment, status } : payment
    ))
    notify(status === 'Paid' ? 'Marked Paid by you. This is not a college confirmation.' : 'Marked Due by you.')
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
              Herald College
            </strong>

            <small>
              STUDENT SPACE
            </small>
          </div>
        </div>

        <div className="sidebar-label">YOUR SPACE <span>01 / 08</span></div>

        <nav className="side-nav">
          {nav.map(
            ({
              name,
              icon: Icon,
            }, index) => (
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

                <small className="nav-index">{String(index + 1).padStart(2, '0')}</small>

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
            <div className="help-card-icon"><Sparkles size={17} /></div>
            <strong>Need the short version?</strong>
            <p>Ask about your notices, files and deadlines.</p>
            <button onClick={() => navigate('Ask AI')}>Open Ask AI <ArrowRight size={15} /></button>
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

            <div className="topbar-context">
              <span>UNISYNC <b>/</b> HERALD COLLEGE</span>
              <strong>{page}</strong>
            </div>
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

              <span>Search your space</span>
            </button>

            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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

        <main className="content" aria-busy={loading}>
          <div className={`workspace-reveal t-skel ${loading ? '' : 'is-revealed'}`} data-state={loading ? 'loading' : 'ready'}>
            <div className="t-skel-skeleton is-pulsing"><WorkspaceSkeleton /></div>
            <div className="t-skel-content">
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
                  updateCalendar={updateCalendar}
                  onPaymentStatus={updatePaymentStatus}
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
                  loadError={documentsError}
                  onOpen={openDocument}
                />
              )}

              {page ===
                'Ask AI' && (
                <AskAI payments={payments} events={events} updateCalendar={updateCalendar} theme={theme} />
              )}

              {page ===
                'Profile' && (
                <Profile
                  notify={
                    notify
                  }
                  email={email}
                  theme={theme}
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                />
              )}
            </div>
          </div>
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
            {badge(selectedEvent.calendarState === 'Added'
              ? selectedEvent.googleCalendarEventId ? 'Synced' : 'Syncing'
              : selectedEvent.calendarState)}
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

          {selectedEvent.calendarState === 'Pending' && (
            <button
              className="primary-button"
              onClick={() => updateCalendar(selectedEvent, 'Added')}
            >
              <Plus size={16} />
              Add to calendar
            </button>
          )}
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

          {documents.filter(file => file.gmailMessageId === selectedNotice.gmailMessageId).map(file => (
            <button key={file.id} className="secondary-button" onClick={() => void openDocument(file)}>
              <FileText size={15} /> Open {file.name}
            </button>
          ))}
          {selectedNotice.attachmentNames?.filter(name =>
            !documents.some(file => file.gmailMessageId === selectedNotice.gmailMessageId && file.name === name)
          ).map(name => <p key={name}>Attachment in Gmail: {name}</p>)}
          {gmailUrlForNotice(selectedNotice) && (
            <a className="secondary-button" href={gmailUrlForNotice(selectedNotice)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Open this email in Gmail
            </a>
          )}
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

      {!!toasts.length && <div
        className={`t-stack toast-stack ${toastSpread ? 'is-spread' : ''}`}
        onPointerEnter={() => setToastSpread(true)}
        onPointerLeave={() => setToastSpread(false)}
        aria-label="Notifications"
      >
        {toasts.map((toast, index) => <div
          className={`t-stack-banner toast ${toast.entering ? 'is-enter' : ''} ${toast.leaving || index > 2 ? 'is-leaving' : ''}`}
          data-depth={Math.min(index, 3)}
          key={toast.id}
          role="status"
        >
          <Check size={18} />
          <span>{toast.message}</span>
          <button onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>)}
      </div>}
    </div>
  )
}
