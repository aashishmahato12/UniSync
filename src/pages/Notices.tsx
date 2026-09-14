import './Notices.css'
import { useState } from 'react'
import {
  ArrowUpRight,
  ExternalLink,
  FileText,
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
        title="Notices"
        copy="The important details from every college update."
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

        <span className="result-count">
          {filtered.length} notices
        </span>
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
          <div className="notice-reader-bar"><span><FileText size={16} /> COLLEGE NOTICE</span><span>{formatDate(selected.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div className="notice-reader-body">
            <div className="notice-reader-tags">{badge(selected.category)} {selected.priority === 'High' && badge('High')}</div>
            <h2>{selected.title}</h2>
            <p className="notice-reader-source">From {selected.source}</p>
            <section className="notice-reader-summary"><span><Sparkles size={17} /> AT A GLANCE</span><p>{selected.summary}</p></section>
            {selected.attachment && <section className="notice-reader-files"><h3>Attached files</h3>{(selected.attachmentNames?.length ? selected.attachmentNames : [selected.attachment]).map(name => <div key={name}><Paperclip size={15} /><span>{name}</span></div>)}</section>}
            <div className="notice-reader-actions">
              <button className="primary-button" onClick={() => onNotice(selected)}>View notice & files <ArrowUpRight size={15} /></button>
              {selected.sourceUrl && <a className="secondary-button" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Original email <ExternalLink size={15} /></a>}
            </div>
          </div>
        </article>
      </div> : <EmptyState title="No notices" copy="New notices will appear here." />}
    </>
  )
}
