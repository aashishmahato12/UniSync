import './Documents.css'
import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Mail, Search, X } from 'lucide-react'
import { formatDate, type DocumentItem } from '../data'
import { EmptyState, SectionHeading } from '../components/UI'

const topicFor = (file: DocumentItem) => file.emailSubject === '(No subject)'
  ? `${file.category} update from Herald College`
  : file.emailSubject

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
  const filtered = documents.filter(file =>
    (category === 'All files' || file.category === category) &&
    `${file.name} ${file.emailSubject} ${file.sender} ${file.noticeSummary ?? ''} ${file.extractedText ?? ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Documents</h1>
          <p>Your college files, their email context, and the text that has been read from them.</p>
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
          <SectionHeading eyebrow="COLLEGE LIBRARY" title={`${filtered.length} ${filtered.length === 1 ? 'document' : 'documents'}`} />
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
        {filtered.length ? <div className="document-grid">{filtered.map(file => (
          <article className="document-card" key={file.id}>
            <div className="document-card-top">
              <span className="document-icon"><FileText size={21} /></span>
              <span className="document-card-category">{file.category}</span>
            </div>
            <div className="document-card-content">
              <p className="document-card-from">From {file.sender} · {formatDate(file.date)}</p>
              <h3 title={topicFor(file)}>{topicFor(file)}</h3>
              <p className="document-card-preview">{file.noticeSummary || (file.extractedText ? file.extractedText.slice(0, 200) : 'Open this file to read its college notice.')}</p>
              <div className="document-card-file">
                <FileText size={16} />
                <div><span>ATTACHED FILE</span><strong title={file.name}>{file.name}</strong><small>{file.type} · {file.size}</small></div>
              </div>
            </div>
            <div className="document-card-bottom">
              <span className={`document-read-state ${file.extractedText ? 'ready' : ''}`}>{file.extractedText ? 'File text ready' : file.extractionStatus === 'No text' ? 'Could not read text' : 'File text pending'}</span>
              <div className="document-card-actions">
                <button className="document-card-read" onClick={() => setSelected(file)}>Read details</button>
                <button aria-label={`Open file ${file.name}`} title="Open original file" onClick={() => onOpen(file)}><ExternalLink size={15} /></button>
                <a href={file.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open source email for ${file.name}`} title="Open source email"><Mail size={15} /></a>
              </div>
            </div>
          </article>
        ))}</div> : (
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
