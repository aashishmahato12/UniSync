import './Documents.css'
import { useState } from 'react'
import { ExternalLink, FileText, FolderOpen, Mail, Search } from 'lucide-react'
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
  const categories = ['Academic', 'Finance', 'Campus', 'General']
  const filtered = documents.filter(file =>
    (category === 'All files' || file.category === category) &&
    `${file.name} ${file.emailSubject} ${file.sender} ${file.noticeSummary ?? ''}`.toLowerCase().includes(query.toLowerCase())
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
            </div>
            <span>{file.category}</span>
            <span>{formatDate(file.date)}</span>
            <div className="document-actions">
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
    </>
  )
}
