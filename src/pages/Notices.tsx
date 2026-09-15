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
} from '../data'

import {
  EmptyState,
  PageIntro,
  badge,
} from '../components/UI'
import { gmailUrlForNotice } from '../services/gmailLinks'
import { cleanEmailForReading } from '../services/emailText'

export default function Notices({
  notices,
  onNotice,
}: {
  notices: Notice[]
  onNotice: (notice: Notice) => void
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
  const selected = filtered.find(notice => notice.id === selectedId) || filtered[0]

  return (
    <>
      <PageIntro
        title="College inbox"
        copy="Read the useful part first, then open the full email or its attachments when needed."
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

        <span className="result-count">{filtered.length} notices</span>
      </div>

      {selected ? <div className="notice-mail-layout">
        <div className="notice-mail-list" aria-label="College notices">
          <div className="notice-mail-list-heading"><strong>Inbox</strong><span>{filtered.length} updates</span></div>
          {filtered.map(notice => <button
            className={`notice-mail-item ${selected.id === notice.id ? 'selected' : ''}`}
            key={notice.id}
            onClick={() => setSelectedId(notice.id)}
            aria-pressed={selected.id === notice.id}
          >
            <span className="notice-mail-item-top"><span>{notice.category}</span><time>{formatDate(notice.date)}</time></span>
            <strong>{notice.title}</strong>
            <span className="notice-mail-snippet">{notice.summary}</span>
            <span className="notice-mail-item-bottom">{notice.priority === 'High' && badge('High')}{notice.attachment && <span><Paperclip size={13} /> Attachment</span>}<ArrowUpRight size={15} /></span>
          </button>)}
        </div>
        <article className="notice-reader">
          <div className="notice-reader-bar"><span><Mail size={16} /> COLLEGE EMAIL</span><span>{selected.receivedAt ? new Date(selected.receivedAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' }) : formatDate(selected.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div className="notice-reader-body">
            <div className="notice-reader-tags">{badge(selected.category)} {selected.priority === 'High' && badge('High')}</div>
            <h2>{selected.title}</h2>
            <div className="notice-reader-sender"><span className="notice-reader-avatar">H</span><div><strong>{selected.source.replace(/ · Email$/, '')}</strong><small>Herald College email</small></div></div>
            <section className="notice-reader-summary"><span><Sparkles size={17} /> AT A GLANCE</span><p>{selected.summary}</p></section>
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
        </article>
      </div> : <EmptyState title="No notices" copy="New notices will appear here." />}
    </>
  )
}
