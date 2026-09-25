import './Notices.css'
import { useState } from 'react'
import {
  ArrowUpRight,
  ExternalLink,
  FileText,
  Mail,
  Paperclip,
  Sparkles,
} from 'lucide-react'

import {
  formatDate,
  type Notice,
  type EventItem,
  type CalendarState,
} from '../data'

import {
  EmptyState,
  PageIntro,
  badge,
} from '../components/UI'
import { gmailUrlForNotice } from '../services/gmailLinks'
import { cleanEmailForReading } from '../services/emailText'
import GlassSurface from '../components/GlassSurface'
import JellyRadio from '../components/JellyRadio'
import InboxEventActions from '../components/InboxEventActions'

const inboxFilterTones: Record<string, string> = {
  All: 'all',
  Payments: 'payment',
  Exams: 'exam',
  Academics: 'academic',
  'Campus life': 'event',
  General: 'general',
}

export default function Notices({
  notices,
  onNotice,
  events,
  updateCalendar,
  readNoticeIds,
  onRead,
}: {
  notices: Notice[]
  onNotice: (notice: Notice) => void
  events: EventItem[]
  updateCalendar: (event: EventItem, state: CalendarState) => void | Promise<void>
  readNoticeIds: ReadonlySet<string>
  onRead: (notice: Notice) => void
}) {
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const categories = [
    'All',
    'Payments',
    'Exams',
    'Academics',
    'Campus life',
    'General',
  ]

  const filtered =
    filter === 'All'
      ? notices
      : notices.filter(n => n.category === filter)
  const selected = filtered.find(notice => notice.id === selectedId)

  const changeFilter = (category: string) => {
    setFilter(category)
    setSelectedId(null)
  }
  const selectNotice = (notice: Notice) => {
    setSelectedId(notice.id)
    onRead(notice)
  }

  return (
    <div className="notices-page">
      <section className="figma-mobile-feed" aria-label="Latest college emails">
        <div className="mobile-inbox-filter-reveal">
          <JellyRadio items={categories} value={filter} onChange={changeFilter} toneForItem={item => inboxFilterTones[item]} ariaLabel="Filter college emails" className="mobile-inbox-filter" />
        </div>
        <p className="mobile-inbox-hint">Tap an email to read its details</p>
        {filtered.map((notice, index) => {
          const unread = !readNoticeIds.has(notice.id)
          const card = <button
          className={`figma-mail-card depth-${Math.min(index, 2)} ${(index === 0 || index === 2) ? 'is-stacked' : ''} ${unread ? 'is-unread' : ''}`}
          onClick={() => onNotice(notice)}
          aria-label={`${unread ? 'Unread: ' : ''}${notice.title}`}
        >
          <span className="figma-sender-avatar">{notice.source?.match(/[A-Za-z]/)?.[0].toUpperCase() || 'H'}</span>
          <span className="figma-mail-content">
            <span className="figma-mail-heading">
              <strong>{unread && <i className="notice-unread-dot" aria-hidden="true" />}{notice.title}</strong>
              <span className="figma-mail-tags"><em className={`category-${notice.category.toLowerCase().replace(/\s+/g, '-')}`}>{notice.category}</em>{notice.priority === 'High' && <em className="urgent">High</em>}</span>
              <time>{formatDate(notice.date, { month: 'short', day: 'numeric' })}</time>
            </span>
            <span className="figma-mail-summary"><Sparkles size={13} />{notice.summary}</span>
          </span>
          {notice.attachment && <span className="figma-attachment" title="Has attachment"><Paperclip size={14} /></span>}
          </button>
          return <div
            className="figma-mobile-entry"
            key={`${filter}-${notice.id}`}
          >
            {index === 0
              ? <GlassSurface className="figma-mail-glass" borderRadius={21} backgroundOpacity={0.38}>{card}</GlassSurface>
              : card}
          </div>
        })}
        {!filtered.length && <div className="figma-feed-empty">Your Herald College emails will appear here.</div>}
      </section>

      <div className="inbox-intro-reveal">
        <PageIntro
          title="College inbox"
          copy="Read the useful part first, then open the full email or its attachments when needed."
        />
      </div>

      <div className="page-toolbar">
        <JellyRadio items={categories} value={filter} onChange={changeFilter} toneForItem={item => inboxFilterTones[item]} ariaLabel="Filter college emails" className="inbox-category-filter" />

        <span className="result-count">{filtered.length} notices</span>
      </div>

      {filtered.length ? <div className="notice-mail-layout">
        <div className="notice-mail-list" aria-label="College notices" key={filter}>
          <div className="notice-mail-list-heading"><strong>Inbox</strong><span>{filtered.length} updates</span></div>
          {filtered.map(notice => <button
            className={`notice-mail-item ${selected?.id === notice.id ? 'selected' : ''} ${!readNoticeIds.has(notice.id) ? 'is-unread' : ''}`}
            key={notice.id}
            onClick={() => selectNotice(notice)}
            aria-pressed={selected?.id === notice.id}
            aria-label={`${!readNoticeIds.has(notice.id) ? 'Unread: ' : ''}${notice.title}`}
          >
          <span className="notice-mail-item-top">
            <span className="notice-mail-item-tags">
              <span className={`category-${notice.category.toLowerCase().replace(/\s+/g, '-')}`}>{notice.category}</span>
              {notice.priority === 'High' && badge('High')}
            </span>
            <time>{formatDate(notice.date)}</time>
          </span>
            <strong>{!readNoticeIds.has(notice.id) && <i className="notice-unread-dot" aria-hidden="true" />}{notice.title}</strong>
            <span className="notice-mail-snippet">{notice.summary}</span>
            <span className="notice-mail-item-bottom">{notice.attachment && <span><Paperclip size={13} /> Attachment</span>}<ArrowUpRight size={15} /></span>
          </button>)}
        </div>
        {selected ? <article
          key={selected.id}
          className="notice-reader"
        >
          <div className="notice-reader-bar"><span><Mail size={16} /> COLLEGE EMAIL</span><span>{selected.receivedAt ? new Date(selected.receivedAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' }) : formatDate(selected.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div className="notice-reader-body">
            <div className="notice-reader-tags">{badge(selected.category)} {selected.priority === 'High' && badge('High')}</div>
            <h2>{selected.title}</h2>
            <div className="notice-reader-sender"><span className="notice-reader-avatar">H</span><div><strong>{selected.source.replace(/ · Email$/, '')}</strong><small>Herald College email</small></div></div>
            <GlassSurface className="notice-summary-glass" borderRadius={23} backgroundOpacity={0.42}><section className="notice-reader-summary"><span><Sparkles size={17} /> AT A GLANCE</span><p>{selected.summary}</p></section></GlassSurface>
            <InboxEventActions notice={selected} events={events} updateCalendar={updateCalendar} />
            <section className="notice-reader-original"><h3><FileText size={17} /> Original message</h3>{cleanEmailForReading(selected.bodyText)
              ? <div className="notice-reader-email-body">{cleanEmailForReading(selected.bodyText)}</div>
              : <p className="notice-reader-unavailable">{selected.attachment ? 'This email may contain the notice in an attachment. Open the saved files below.' : 'The full message has not been saved here yet. You can open the original in Gmail for now.'}</p>}
            </section>
            {selected.attachment && <section className="notice-reader-files"><h3>Attached files</h3>{(selected.attachmentNames?.length ? selected.attachmentNames : [selected.attachment]).map(name => <div key={name}><Paperclip size={15} /><span>{name}</span></div>)}</section>}
            <div className="notice-reader-actions">
              {selected.attachment && <button className="primary-button" onClick={() => onNotice(selected)}>Open saved files <ArrowUpRight size={15} /></button>}
              {gmailUrlForNotice(selected) && <a className="secondary-button" href={gmailUrlForNotice(selected)} target="_blank" rel="noopener noreferrer">Open this email in Gmail <ExternalLink size={15} /></a>}
            </div>
          </div>
        </article> : <aside
          className="notice-reader-empty"
          aria-label="Select an email"
        >
          <span className="notice-reader-empty-icon"><Mail size={27} strokeWidth={1.7} /></span>
          <span className="notice-reader-empty-kicker">YOUR COLLEGE INBOX</span>
          <h2>Pick an email to read</h2>
          <p>Select any message in the list to see its summary, original email, and attachments here.</p>
          <span className="notice-reader-empty-hint"><ArrowUpRight size={15} /> Choose a message to open its details</span>
        </aside>}
      </div> : <EmptyState title="No notices" copy="New notices will appear here." />}
    </div>
  )
}
