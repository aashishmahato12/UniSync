import './Notices.css'
import { useState } from 'react'
import {
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

      <div className="notice-cards">
        {filtered.length ? (
          filtered.map(notice => (
            <article className="notice-card" key={notice.id}>
              <div className="notice-card-top">
                <div className="notice-mark">
                  <FileText size={20} />
                </div>

                <div>
                  {badge(notice.category)}{' '}
                  {notice.priority === 'High' && badge('High')}
                </div>
              </div>

              <h3>{notice.title}</h3>

              <p className="notice-meta">
                {formatDate(notice.date, {
                  month: 'long',
                  day: 'numeric',
                })}
                {' · '}
                {notice.source}
              </p>

              <div className="summary-preview">
                <Sparkles size={16} />
                <p>{notice.summary}</p>
              </div>

              <div className="notice-card-footer">
                {notice.attachment ? (
                  <span>
                    <Paperclip size={15} />
                    {notice.attachmentNames?.length && notice.attachmentNames.length > 1
                      ? `${notice.attachmentNames.length} attachments` : notice.attachment}
                  </span>
                ) : (
                  <span>No attachment</span>
                )}

                <button
                  className="text-link"
                  onClick={() => onNotice(notice)}
                >
                  View source
                  <ExternalLink size={15} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="No notices"
            copy="New notices will appear here."
          />
        )}
      </div>
    </>
  )
}