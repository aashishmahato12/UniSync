import './Notices.css'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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

// Match JellyRadio's default spring, with a smaller squash for full-size cards.
const inboxJellyDamping = 2 * Math.sqrt(460 * .9) * (1 - .3)
const inboxJellySpring = { type: 'spring' as const, stiffness: 460, damping: inboxJellyDamping, mass: .9 }
const inboxEntryTransition = (index: number) => {
  const delay = Math.min(index, 8) * .055
  return {
    y: { ...inboxJellySpring, delay },
    scaleX: { ...inboxJellySpring, stiffness: 460 * (1 + .24 * 1.3), damping: inboxJellyDamping * .75, delay },
    scaleY: { ...inboxJellySpring, stiffness: 460 * (1 - .14 * 1.3), damping: inboxJellyDamping * .85, delay: delay + .05 * 1.3 },
    opacity: { duration: .24, delay },
  }
}
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
}: {
  notices: Notice[]
  onNotice: (notice: Notice) => void
}) {
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

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

  return (
    <div className="notices-page">
      <section className="figma-mobile-feed" aria-label="Latest college emails">
        <JellyRadio items={categories} value={filter} onChange={changeFilter} toneForItem={item => inboxFilterTones[item]} ariaLabel="Filter college emails" className="mobile-inbox-filter" />
        <p className="mobile-inbox-hint">Tap an email to read its details</p>
        {filtered.map((notice, index) => {
          const card = <button
          className={`figma-mail-card depth-${Math.min(index, 2)} ${(index === 0 || index === 2) ? 'is-stacked' : ''}`}
          onClick={() => onNotice(notice)}
        >
          <span className="figma-sender-avatar">{notice.source?.match(/[A-Za-z]/)?.[0].toUpperCase() || 'H'}</span>
          <span className="figma-mail-content">
            <span className="figma-mail-heading">
              <strong>{notice.title}</strong>
              <span className="figma-mail-tags"><em className={`category-${notice.category.toLowerCase().replace(/\s+/g, '-')}`}>{notice.category}</em>{notice.priority === 'High' && <em className="urgent">High</em>}</span>
              <time>{formatDate(notice.date, { month: 'short', day: 'numeric' })}</time>
            </span>
            <span className="figma-mail-summary"><Sparkles size={13} />{notice.summary}</span>
          </span>
          {notice.attachment && <span className="figma-attachment" title="Has attachment"><Paperclip size={14} /></span>}
          </button>
          return <motion.div
            className="figma-mobile-entry"
            key={`${filter}-${notice.id}`}
            initial={reduceMotion ? false : { opacity: .2, y: 11, scaleX: .93, scaleY: 1.07 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            transition={reduceMotion ? { duration: 0 } : inboxEntryTransition(index)}
          >
            {index === 0
              ? <GlassSurface className="figma-mail-glass" borderRadius={21} backgroundOpacity={0.38}>{card}</GlassSurface>
              : card}
          </motion.div>
        })}
        {!filtered.length && <div className="figma-feed-empty">Your Herald College emails will appear here.</div>}
      </section>

      <PageIntro
        title="College inbox"
        copy="Read the useful part first, then open the full email or its attachments when needed."
      />

      <div className="page-toolbar">
        <JellyRadio items={categories} value={filter} onChange={changeFilter} toneForItem={item => inboxFilterTones[item]} ariaLabel="Filter college emails" className="inbox-category-filter" />

        <span className="result-count">{filtered.length} notices</span>
      </div>

      {filtered.length ? <div className="notice-mail-layout">
        <div className="notice-mail-list" aria-label="College notices" key={filter}>
          <div className="notice-mail-list-heading"><strong>Inbox</strong><span>{filtered.length} updates</span></div>
          {filtered.map((notice, index) => <motion.button
            className={`notice-mail-item ${selected?.id === notice.id ? 'selected' : ''}`}
            key={notice.id}
            initial={reduceMotion ? false : { opacity: .2, y: 11, scaleX: .93, scaleY: 1.07 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            transition={reduceMotion ? { duration: 0 } : inboxEntryTransition(index)}
            onClick={() => setSelectedId(notice.id)}
            aria-pressed={selected?.id === notice.id}
          >
          <span className="notice-mail-item-top"><span className={`category-${notice.category.toLowerCase().replace(/\s+/g, '-')}`}>{notice.category}</span><time>{formatDate(notice.date)}</time></span>
            <strong>{notice.title}</strong>
            <span className="notice-mail-snippet">{notice.summary}</span>
            <span className="notice-mail-item-bottom">{notice.priority === 'High' && badge('High')}{notice.attachment && <span><Paperclip size={13} /> Attachment</span>}<ArrowUpRight size={15} /></span>
          </motion.button>)}
        </div>
        {selected ? <motion.article
          key={selected.id}
          className="notice-reader"
          initial={reduceMotion ? false : { opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={reduceMotion ? { duration: 0 } : { duration: .32, ease: 'easeOut' }}
        >
          <div className="notice-reader-bar"><span><Mail size={16} /> COLLEGE EMAIL</span><span>{selected.receivedAt ? new Date(selected.receivedAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' }) : formatDate(selected.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div className="notice-reader-body">
            <div className="notice-reader-tags">{badge(selected.category)} {selected.priority === 'High' && badge('High')}</div>
            <h2>{selected.title}</h2>
            <div className="notice-reader-sender"><span className="notice-reader-avatar">H</span><div><strong>{selected.source.replace(/ · Email$/, '')}</strong><small>Herald College email</small></div></div>
            <GlassSurface className="notice-summary-glass" borderRadius={23} backgroundOpacity={0.42}><section className="notice-reader-summary"><span><Sparkles size={17} /> AT A GLANCE</span><p>{selected.summary}</p></section></GlassSurface>
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
        </motion.article> : <motion.aside
          className="notice-reader-empty"
          aria-label="Select an email"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: .3, ease: 'easeOut' }}
        >
          <span className="notice-reader-empty-icon"><Mail size={27} strokeWidth={1.7} /></span>
          <span className="notice-reader-empty-kicker">YOUR COLLEGE INBOX</span>
          <h2>Pick an email to read</h2>
          <p>Select any message in the list to see its summary, original email, and attachments here.</p>
          <span className="notice-reader-empty-hint"><ArrowUpRight size={15} /> Choose a message to open its details</span>
        </motion.aside>}
      </div> : <EmptyState title="No notices" copy="New notices will appear here." />}
    </div>
  )
}
