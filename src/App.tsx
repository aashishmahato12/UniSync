import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Liquid } from 'liquid-gooey'

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
  Inbox,
  Menu,
  MailPlus,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'

import {
  formatDate,
  payments as seedPayments,
  type CalendarState,
  type CustomEventInput,
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
import Calendar from './pages/Calendar'
import Payments from './pages/Payments'
import { loadPaymentStatuses, savePaymentStatuses } from './services/paymentStatusStore'
import { loadReadNoticeIds, saveReadNoticeIds } from './services/noticeReadStore'
import { gmailUrlForNotice } from './services/gmailLinks'
import Documents from './pages/Documents'
import AskAI from './pages/AskAI'
import Profile from './pages/Profile'
import CollegeEmail from './pages/CollegeEmail'
import AuthGate from './components/AuthGate'
import { cleanEmailForReading } from './services/emailText'
import InboxEventActions from './components/InboxEventActions'

type Page =
  | 'Dashboard'
  | 'Notices'
  | 'Calendar'
  | 'Payments'
  | 'Documents'
  | 'College Email'
  | 'Ask AI'
  | 'Profile'

const nav: {
  name: Page
  label: string
  icon: typeof Home
}[] = [
  {
    name: 'Dashboard',
    label: 'Today',
    icon: Home,
  },
  {
    name: 'Notices',
    label: 'Inbox',
    icon: Bell,
  },
  {
    name: 'Calendar',
    label: 'Calendar',
    icon: Clock3,
  },
  {
    name: 'Payments',
    label: 'Payments',
    icon: CreditCard,
  },
  {
    name: 'Documents',
    label: 'Files',
    icon: FolderOpen,
  },
  {
    name: 'College Email',
    label: 'Email college',
    icon: MailPlus,
  },
  {
    name: 'Ask AI',
    label: 'Ask UniSync',
    icon: Sparkles,
  },
]

const pageLabel = (page: Page) => nav.find(item => item.name === page)?.label || page

const mobileLiquidNav: {
  name: Page
  label: string
  icon: typeof Home
  x: number
  y: number
}[] = [
  { name: 'Payments', label: 'Payments', icon: CreditCard, x: -90, y: -68 },
  { name: 'College Email', label: 'Email', icon: MailPlus, x: -31, y: -108 },
  { name: 'Ask AI', label: 'Ask AI', icon: Sparkles, x: 31, y: -108 },
  { name: 'Profile', label: 'Profile', icon: UserRound, x: 90, y: -68 },
]

const initials = 'AM'

function MobileSortIcon() {
  return <svg className="mobile-sort-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path className="mobile-sort-lines" d="M10 6h9M10 11h6M10 16h3" />
    <path className="mobile-sort-arrow" d="M5 5v13m0 0-3-3m3 3 3-3" />
  </svg>
}

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
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) return
    const animateTarget = (source: EventTarget | null) => {
      if (!(source instanceof Element)) return
      const clickable = source.closest<HTMLElement>('button, a, [role="button"]')
      if (!clickable || !clickable.closest('.app-shell, .modal, .document-detail, .document-upload')) return
      if (clickable.matches(':disabled, [aria-disabled="true"]')) return
      if (clickable.closest('.sidebar, .topbar, .mobile-bottom-nav, .jelly-radio')) return
      const bounds = clickable.getBoundingClientRect()
      const animationClass = bounds.width > 300 || bounds.height > 96 ? 'unisync-click-soft' : 'unisync-click-jello'
      clickable.classList.remove('unisync-click-jello', 'unisync-click-soft')
      void clickable.offsetWidth
      clickable.classList.add(animationClass)
      clickable.addEventListener('animationend', () => clickable.classList.remove(animationClass), { once: true })
    }
    const animatePointer = (event: PointerEvent) => animateTarget(event.target)
    const animateKeyboardClick = (event: MouseEvent) => {
      if (event.detail === 0) animateTarget(event.target)
    }
    document.addEventListener('pointerdown', animatePointer)
    document.addEventListener('click', animateKeyboardClick)
    return () => {
      document.removeEventListener('pointerdown', animatePointer)
      document.removeEventListener('click', animateKeyboardClick)
    }
  }, [reduceMotion])
  const [page, setPage] =
    useState<Page>('Dashboard')
  const [menuOpen, setMenuOpen] =
    useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [events, setEvents] =
    useState<EventItem[]>([])

  const [notices, setNotices] =
    useState<Notice[]>([])
  const [readNoticeIds, setReadNoticeIds] = useState<Set<string>>(() => loadReadNoticeIds(email))

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
  const [noticeClosing, setNoticeClosing] = useState(false)
  const [noticeReturning, setNoticeReturning] = useState(false)
  const noticeListScroll = useRef(0)

  useLayoutEffect(() => {
    if (selectedNotice) window.scrollTo(0, 0)
  }, [selectedNotice])

  const markNoticeRead = (notice: Notice) => {
    setReadNoticeIds(current => {
      if (current.has(notice.id)) return current
      const next = new Set(current).add(notice.id)
      saveReadNoticeIds(email, next)
      return next
    })
  }

  const openNotice = (notice: Notice) => {
    markNoticeRead(notice)
    setNotificationOpen(false)
    noticeListScroll.current = window.scrollY
    setNoticeClosing(false)
    setNoticeReturning(false)
    setSelectedNotice(notice)
  }

  const finishCloseNotice = () => {
    setSelectedNotice(null)
    setNoticeClosing(false)
    setNoticeReturning(!reduceMotion)
    window.requestAnimationFrame(() => window.scrollTo(0, noticeListScroll.current))
  }

  const closeNotice = () => {
    if (reduceMotion) finishCloseNotice()
    else setNoticeClosing(true)
  }

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

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

  const uploadDocument = async (file: File, category: string) => {
    const uploaded = await studentService.uploadDocument(file, category)
    setDocuments(current => [uploaded, ...current])
    setDocumentsError(false)
    notify(`${file.name} added to ${category}.`)
    return uploaded
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
    setSelectedNotice(null)
    setNoticeClosing(false)
    setNoticeReturning(false)
    setPage(target)
    setMenuOpen(false)
    setSearchOpen(false)
    setNotificationOpen(false)
    setMobileNavOpen(false)
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
          ? 'Added. Google Calendar will update after sync.'
          : 'Calendar preference saved.')
      } catch (error) {
        console.error(error)
        notify('Could not save this event. Please try again.')
      }
    }

  const createCalendarEvent = async (input: CustomEventInput) => {
    const event = await studentService.createCalendarEvent(input)
    setEvents(previous => [...previous, event]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')))
    notify('Event added to your calendar.')
    return event
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
              'Notices' as Page,
          })),
      ]
    }, [
      globalSearch,
      notices,
      events,
    ])

  const unreadNoticeCount = notices.reduce((count, notice) => count + (readNoticeIds.has(notice.id) ? 0 : 1), 0)
  const latestNotices = [...notices]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 5)

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

        <div className="sidebar-label">YOUR SPACE <span>LIVE</span></div>

        <nav className="side-nav">
          {nav.map(
            ({
              name,
              label,
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
                {page === name && <motion.span
                  className="nav-jelly-selection"
                  layoutId="nav-jelly-selection"
                  initial={false}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 23, mass: 0.85 }}
                  aria-hidden="true"
                />}
                <Icon size={18} />

                <span>
                  {label}
                </span>

                <small className="nav-index">{String(index + 1).padStart(2, '0')}</small>

                {name === 'Notices' && unreadNoticeCount > 0 && (
                    <em>
                      {unreadNoticeCount}
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

      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <div className="main-column">
        <div className="mobile-progressive-blur mobile-top-progressive-blur" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <div key={index} />)}
        </div>
        <header className="topbar">
          <div className="mobile-account">
            <button className="mobile-account-avatar" onClick={() => navigate('Profile')} aria-label="Open profile">{initials}</button>
            <button className="mobile-account-copy" onClick={() => navigate('Notices')}>
              <small>{email}</small>
              <strong>{page === 'Notices' ? 'All Inboxes' : pageLabel(page)}</strong>
            </button>
          </div>
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
              <strong>{pageLabel(page)}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setNotificationOpen(false)
                setSearchOpen(true)
              }}
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

            <div className="notification-popover-wrap">
              <button
                className="icon-button desktop-notice-button"
                onClick={() => {
                  setSearchOpen(false)
                  setNotificationOpen(open => !open)
                }}
                aria-label="Show latest inbox messages"
                aria-expanded={notificationOpen}
                aria-controls="latest-inbox-popover"
              >
                <Bell size={19} />
                <span className="t-badge" data-open={unreadNoticeCount > 0 ? 'true' : 'false'} aria-hidden="true">
                  <span className="t-badge-dot">{unreadNoticeCount > 99 ? '99+' : unreadNoticeCount}</span>
                </span>
              </button>
              {notificationOpen && <>
                <button className="notification-popover-scrim" onClick={() => setNotificationOpen(false)} aria-label="Close latest inbox" />
                <section className="notification-popover" id="latest-inbox-popover" aria-label="Latest inbox messages">
                  <header><div><small>NOTIFICATIONS</small><h2>Latest inbox</h2></div><span>{unreadNoticeCount} unread</span></header>
                  <div className="notification-popover-list">
                    {latestNotices.length ? latestNotices.map(notice => {
                      const unread = !readNoticeIds.has(notice.id)
                      return <button key={notice.id} className={unread ? 'is-unread' : ''} onClick={() => openNotice(notice)}>
                        <span className="notification-avatar">{notice.source?.match(/[A-Za-z]/)?.[0].toUpperCase() || 'H'}</span>
                        <span className="notification-copy"><strong>{notice.title}</strong><small>{notice.category} · {formatDate(notice.date)}</small></span>
                        {unread && <i aria-label="Unread" />}
                      </button>
                    }) : <p className="notification-empty">New college messages will appear here.</p>}
                  </div>
                </section>
              </>}
            </div>

            <button
              className="icon-button figma-mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Open all UniSync pages"
            >
              <MobileSortIcon />
            </button>
          </div>
        </header>

        <main className="content" aria-busy={loading}>
          <div className={`workspace-reveal t-skel ${loading ? '' : 'is-revealed'}`} data-state={loading ? 'loading' : 'ready'}>
            <div className="t-skel-skeleton is-pulsing"><WorkspaceSkeleton /></div>
            <div className="t-skel-content">
{selectedNotice && (
  <motion.section
    className="notice-detail-page"
    initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .985 }}
    animate={noticeClosing ? { opacity: 0, y: 10, scale: .99 } : { opacity: 1, y: 0, scale: 1 }}
    transition={reduceMotion ? { duration: 0 } : noticeClosing ? { duration: .22, ease: 'easeIn' } : { duration: .36, ease: [.22, 1, .36, 1] }}
    onAnimationComplete={() => { if (noticeClosing) finishCloseNotice() }}
  >
<button className="secondary-button" onClick={closeNotice} disabled={noticeClosing}>← Back</button>
    <article className="notice-detail-view">
      <header className="notice-detail-header">
        <div className="notice-detail-sender">
          <span className="notice-detail-avatar">
            {selectedNotice.source?.match(/[A-Za-z]/)?.[0].toUpperCase() || 'H'}
          </span>

          <div>
            <strong>{selectedNotice.source.replace(/ · Email$/, '')}</strong>
            <small>Herald College email</small>
          </div>
        </div>

        <time>
          {selectedNotice.receivedAt
            ? new Date(selectedNotice.receivedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : selectedNotice.date}
        </time>
      </header>

      <div className="notice-detail-chip">
        {badge(selectedNotice.category)}
        {selectedNotice.priority === 'High' && badge('High')}
      </div>

      <h2>{selectedNotice.title}</h2>

      <section className="notice-detail-summary">
        <span>✦</span>
        <p>{selectedNotice.summary}</p>
      </section>

      <InboxEventActions notice={selectedNotice} events={events} updateCalendar={updateCalendar} />

      <section className="notice-detail-original">
        <h3>
          <FileText size={16} />
          Original Message
        </h3>

        <div>
          {cleanEmailForReading(selectedNotice.bodyText) ||
            'The original message is not saved yet. Open this email in Gmail to read the complete message.'}
        </div>
      </section>

      {!!selectedNotice.attachmentNames?.length && (
        <section className="notice-detail-files">
          <h3>Attachments</h3>

          {selectedNotice.attachmentNames.map(name => (
            <p key={name}>
              <FileText size={14} />
              {name}
            </p>
          ))}
        </section>
      )}

      <div className="notice-detail-actions">
        <button
          className="primary-button"
          onClick={() => navigate('Ask AI')}
        >
          Ask AI
        </button>

        {gmailUrlForNotice(selectedNotice) && (
          <a
            className="secondary-button"
            href={gmailUrlForNotice(selectedNotice)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Gmail
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </article>
  </motion.section>
)}
<div
  key={page}
  hidden={!!selectedNotice}
  className={`${noticeReturning ? 'notice-returning ' : ''}${page === 'Notices' || page === 'Calendar' ? '' : 'page-scale-shell'}`.trim() || undefined}
  onAnimationEnd={event => { if (event.target === event.currentTarget) setNoticeReturning(false) }}
>
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
                    openNotice
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
                    openNotice
                  }
                  events={events}
                  updateCalendar={updateCalendar}
                  readNoticeIds={readNoticeIds}
                  onRead={markNoticeRead}
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
                  createEvent={createCalendarEvent}
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
                  onUpload={uploadDocument}
                  onPreview={studentService.openDocument}
                />
              )}

              {page === 'College Email' && (
                <CollegeEmail senderEmail={email} notify={notify} />
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
          </div>
        </main>

        <AnimatePresence>
          {mobileNavOpen && <motion.button
            key="mobile-liquid-scrim"
            className="mobile-liquid-scrim"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close all pages menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : .55 }}
          />}
        </AnimatePresence>
        <div className={`mobile-progressive-blur mobile-liquid-progressive-blur${mobileNavOpen ? ' is-open' : ''}`} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <div key={index} />)}
        </div>
        <nav className={`mobile-bottom-nav${mobileNavOpen ? ' liquid-open' : ''}`} aria-label="Primary navigation">
          <button className={page === 'Dashboard' ? 'active' : ''} onClick={() => navigate('Dashboard')}>{page === 'Dashboard' && <motion.i className="mobile-nav-jelly" layoutId="mobile-nav-jelly" initial={false} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 23 }} aria-hidden="true" />}<Home size={23} /><span>Home</span></button>
          <button className={page === 'Notices' ? 'active' : ''} onClick={() => navigate('Notices')}>{page === 'Notices' && <motion.i className="mobile-nav-jelly" layoutId="mobile-nav-jelly" initial={false} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 23 }} aria-hidden="true" />}<Inbox size={23} /><span>Inbox</span>{unreadNoticeCount > 0 && <em className="mobile-unread-count">{unreadNoticeCount > 99 ? '99+' : unreadNoticeCount}</em>}</button>
          <div className="mobile-liquid-slot">
            <Liquid className="mobile-liquid-menu" blur={9} contrast={20} fill="var(--mobile-liquid-surface)" shadow="0 10px 24px rgba(31,48,68,.18)" filterPadding={34}>
              {mobileLiquidNav.map((item, index) => {
                const Icon = item.icon
                return <Liquid.Item
                  key={item.name}
                  x={mobileNavOpen ? item.x : 0}
                  y={mobileNavOpen ? item.y : 0}
                  scale={mobileNavOpen ? 1 : .62}
                  transition={{ duration: 550, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  delay={mobileNavOpen ? index * 22 : (mobileLiquidNav.length - index) * 12}
                  className="mobile-liquid-item"
                  style={{ position: 'absolute', left: '50%', bottom: 0, marginLeft: -25 }}
                >
                  <button
                    className={`mobile-liquid-page${page === item.name ? ' active' : ''}`}
                    onClick={() => navigate(item.name)}
                    aria-label={`Open ${item.label}`}
                    tabIndex={mobileNavOpen ? 0 : -1}
                    aria-hidden={!mobileNavOpen}
                  >
                    <Icon size={21} strokeWidth={1.7} />
                  </button>
                </Liquid.Item>
              })}
              <Liquid.Item className="mobile-liquid-trigger-item" style={{ position: 'absolute', left: '50%', bottom: 0, marginLeft: -31 }}>
                <button className="mobile-liquid-trigger" onClick={() => setMobileNavOpen(open => !open)} aria-label={mobileNavOpen ? 'Close all pages menu' : 'Open all pages menu'} aria-expanded={mobileNavOpen}>
                  <Plus size={27} strokeWidth={1.8} />
                </button>
              </Liquid.Item>
            </Liquid>
          </div>
          <button className={page === 'Calendar' ? 'active' : ''} onClick={() => navigate('Calendar')}>{page === 'Calendar' && <motion.i className="mobile-nav-jelly" layoutId="mobile-nav-jelly" initial={false} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 23 }} aria-hidden="true" />}<CalendarDays size={23} /><span>Calendar</span></button>
          <button className={page === 'Documents' ? 'active' : ''} onClick={() => navigate('Documents')}>{page === 'Documents' && <motion.i className="mobile-nav-jelly" layoutId="mobile-nav-jelly" initial={false} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 23 }} aria-hidden="true" />}<FolderOpen size={23} /><span>Files</span></button>
        </nav>
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
            {badge(selectedEvent.isCustom
              ? 'Personal'
              : selectedEvent.calendarState === 'Added'
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
