import './Documents.css'
import { useEffect, useState } from 'react'
import { ExternalLink, FileText, FolderOpen, Mail, Search, X } from 'lucide-react'
import { formatDate, type DocumentItem } from '../data'
import { EmptyState, SectionHeading } from '../components/UI'

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
          <p>See which college email each attachment came from, then open the file or its source email.</p>
        </div>
      </div>
      <div className="document-categories">
        {categories.map(item => (
          <button
            key={item}
            className={category === item ? 'selected' : ''}
            onClick={() => setCategory(category === item ? 'All files' : item)}
          >
            <span className="folder-icon"><FolderOpen size={21} /></span>
            <strong>{item}</strong>
            <small>{documents.filter(file => file.category === item).length} files</small>
          </button>
        ))}
      </div>
      <div className="panel document-panel">
        <div className="document-toolbar">
          <SectionHeading title="College attachments" />
          <div className="document-search">
            <Search size={16} />
            <input
              aria-label="Search documents"
              placeholder="Search files"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="document-table-head">
          <span>FILE</span><span>FROM EMAIL</span><span>CATEGORY</span><span>RECEIVED</span><span />
        </div>
        {filtered.length ? filtered.map(file => (
          <div className="document-row" key={file.id}>
            <div className="document-name">
              <span className="document-icon"><FileText size={19} /></span>
              <div><strong>{file.name}</strong><small>{file.type} · {file.size}</small></div>
            </div>
            <div className="document-source">
              <strong>{file.emailSubject}</strong>
              <small>From {file.sender}</small>
              {file.noticeSummary && <small className="document-summary">Email summary: {file.noticeSummary}</small>}
              {file.extractedText && <small className="document-summary">File text ready · {file.extractedText.slice(0, 110)}{file.extractedText.length > 110 ? '…' : ''}</small>}
            </div>
            <span>{file.category}</span>
            <span>{formatDate(file.date)}</span>
            <div className="document-actions">
              <button aria-label={`Read details for ${file.name}`} onClick={() => setSelected(file)}><FileText size={15} /> Read</button>
              <button aria-label={`Open file ${file.name}`} onClick={() => onOpen(file)}><ExternalLink size={15} /> File</button>
              <a href={file.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open source email for ${file.name}`}><Mail size={15} /> Email</a>
            </div>
          </div>
        )) : (
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
            <div><small>{selected.type} · {formatDate(selected.date)}</small><h2 id="document-detail-title">{selected.name}</h2><p>Attached to “{selected.emailSubject}” · From {selected.sender}</p></div>
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
