import './Documents.css'
import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Mail, Search, X } from 'lucide-react'
import { formatDate, type DocumentItem } from '../data'
import { EmptyState, SectionHeading } from '../components/UI'

const topicFor = (file: DocumentItem) => file.emailSubject === '(No subject)'
  ? `${file.category} update from Herald College`
  : file.emailSubject

type EmailGroup = { key: string; files: DocumentItem[] }
type DayGroup = { key: string; sender: string; date: string; emails: EmailGroup[] }

function groupDocuments(files: DocumentItem[]): DayGroup[] {
  const days = new Map<string, DayGroup>()
  for (const file of files) {
    const dayKey = `${file.sender.trim().toLowerCase()}|${file.date}`
    let day = days.get(dayKey)
    if (!day) {
      day = { key: dayKey, sender: file.sender, date: file.date, emails: [] }
      days.set(dayKey, day)
    }
    const emailKey = file.gmailMessageId || `${file.emailSubject}|${file.sourceUrl}`
    let email = day.emails.find(item => item.key === emailKey)
    if (!email) {
      email = { key: emailKey, files: [] }
      day.emails.push(email)
    }
    email.files.push(file)
  }
  return [...days.values()]
}

export default function Documents({
  documents,
  loadError,
  onOpen,
}: {
  documents: DocumentItem[]
  loadError: boolean
  onOpen: (file: DocumentItem) => void
}) {
  const [category, setCategory] = useState('All files')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DocumentItem | null>(null)
  useEffect(() => {
    if (!selected) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selected])
  const categories = ['Academic', 'Finance', 'Campus', 'General']
  const categoryFiles = documents.filter(file => category === 'All files' || file.category === category)
  const search = query.trim().toLowerCase()
  const groups = groupDocuments(categoryFiles).filter(group => !search || group.emails.some(email => email.files.some(file =>
    `${file.name} ${file.emailSubject} ${file.sender} ${file.noticeSummary ?? ''} ${file.extractedText ?? ''}`.toLowerCase().includes(search)
  )))
  const visibleFiles = groups.reduce((count, group) => count + group.emails.reduce((total, email) => total + email.files.length, 0), 0)

  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Files from college</h1>
          <p>Find attachments by topic, sender, and day without remembering the original filename.</p>
        </div>
      </div>
      <div className="document-categories">
        {['All files', ...categories].map(item => (
          <button
            key={item}
            className={category === item ? 'selected' : ''}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}<span>{item === 'All files' ? documents.length : documents.filter(file => file.category === item).length}</span>
          </button>
        ))}
      </div>
      <div className="document-panel">
        <div className="document-toolbar">
          <SectionHeading eyebrow="COLLEGE LIBRARY" title={`${groups.length} ${groups.length === 1 ? 'sender day' : 'sender days'} · ${visibleFiles} ${visibleFiles === 1 ? 'file' : 'files'}`} />
          <div className="document-search">
            <Search size={16} />
            <input
              aria-label="Search documents"
              placeholder="Search file names or text"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
        </div>
        {groups.length ? <div className="document-grid">{groups.map(group => {
          const fileCount = group.emails.reduce((count, email) => count + email.files.length, 0)
          return <article className="document-card" key={group.key}>
            <div className="document-card-top">
              <span className="document-icon"><Mail size={21} /></span>
              <span className="document-card-category">{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
            </div>
            <div className="document-card-content">
              <p className="document-card-from">From {group.sender} · {formatDate(group.date)}</p>
              <p className="document-card-meta">{group.emails.length} {group.emails.length === 1 ? 'email' : 'emails'} on this day</p>
              <div className="document-email-list">{group.emails.map(email => {
                const lead = email.files[0]
                const summary = email.files.find(file => file.noticeSummary)?.noticeSummary
                const text = email.files.find(file => file.extractedText)?.extractedText
                return <section className="document-email" key={email.key}>
                  <h3 title={topicFor(lead)}>{topicFor(lead)}</h3>
                  <p className="document-card-preview">{summary || (text ? text.slice(0, 200) : 'Open a file to read its college notice.')}</p>
                  <div className="document-attachment-list">{email.files.map(file => <div className="document-card-file" key={file.id}>
                    <FileText size={16} />
                    <div className="document-file-info"><strong title={file.name}>{file.name}</strong><small>{file.type} · {file.size} · {file.extractedText ? 'Text ready' : file.extractionStatus === 'No text' ? 'No text found' : 'Text pending'}</small></div>
                    <button className="document-file-read" onClick={() => setSelected(file)} aria-label={`Read details for ${file.name}`}>Read</button>
                    <button className="document-file-open" onClick={() => onOpen(file)} aria-label={`Open original file ${file.name}`} title="Open original file"><ExternalLink size={15} /></button>
                  </div>)}</div>
                  <a className="document-email-source" href={lead.sourceUrl} target="_blank" rel="noopener noreferrer"><Mail size={14} /> Open source email</a>
                </section>
              })}</div>
            </div>
          </article>
        })}</div> : (
          <EmptyState
            title={loadError ? 'Documents need setup' : documents.length ? 'No matching files' : 'No documents yet'}
            copy={loadError
              ? 'The private attachment library is not connected yet.'
              : documents.length ? 'Try another search or category.'
              : 'PDFs and images from college emails will appear here after they are saved.'}
          />
        )}
      </div>
      {selected && <div className="document-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="document-detail" role="dialog" aria-modal="true" aria-labelledby="document-detail-title">
          <div className="document-detail-header">
            <div><small>From {selected.sender} · {formatDate(selected.date)}</small><h2 id="document-detail-title">{topicFor(selected)}</h2><p>Attachment: {selected.name} · {selected.type} · {selected.size}</p></div>
            <button className="document-detail-close" aria-label="Close document details" onClick={() => setSelected(null)}><X size={19} /></button>
          </div>
          <div className="document-detail-body">
            {selected.noticeSummary && <section><h3>Email summary</h3><p>{selected.noticeSummary}</p></section>}
            <section><h3>Text read from file</h3>
              {selected.extractedText ? <pre>{selected.extractedText}</pre>
                : <p>{selected.extractionStatus === 'Pending' ? 'This file is waiting for the attachment reader.'
                  : selected.extractionStatus === 'No text' ? 'The reader could not extract useful text from this file.'
                    : 'No extracted text is available yet. Open the original file to read it.'}</p>}
            </section>
          </div>
          <div className="document-detail-footer">
            <button onClick={() => onOpen(selected)}><ExternalLink size={15} /> Open original file</button>
            <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer"><Mail size={15} /> Open source email</a>
          </div>
        </section>
      </div>}
    </>
  )
}
