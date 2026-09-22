import './Documents.css'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, FileText, Mail, Search, UploadCloud, X } from 'lucide-react'
import { formatDate, type DocumentItem } from '../data'
import { EmptyState, SectionHeading } from '../components/UI'
import FileFolder, { type FolderTone } from '../components/FileFolder'

const topicFor = (file: DocumentItem) => file.emailSubject === 'Personal upload'
  ? file.name
  : file.emailSubject === '(No subject)'
  ? `${file.category} update from Herald College`
  : file.emailSubject

type FolderItem = { label: string; category: string; tone: FolderTone }

const folders: FolderItem[] = [
  { label: 'All files', category: 'All files', tone: 'blue' },
  { label: 'Academic', category: 'Academic', tone: 'violet' },
  { label: 'Finance', category: 'Finance', tone: 'green' },
  { label: 'Campus', category: 'Campus', tone: 'rose' },
  { label: 'General', category: 'General', tone: 'slate' },
]

const displayUploadSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`

function DocumentThumbnail({ file, onPreview }: { file: DocumentItem; onPreview: (file: DocumentItem) => Promise<string> }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const image = file.mimeType.startsWith('image/')
  useEffect(() => {
    if (!image) return
    let current = true
    void onPreview(file).then(url => { if (current) setPreviewUrl(url) }).catch(() => {})
    return () => { current = false }
  }, [file, image, onPreview])
  return <div className={`document-gallery-preview${previewUrl ? ' has-image' : ''}`}>
    {previewUrl
      ? <img src={previewUrl} alt="" loading="lazy" />
      : <span><FileText size={34} /><small>{file.type}</small></span>}
  </div>
}

export default function Documents({
  documents,
  loadError,
  onOpen,
  onUpload,
  onPreview,
}: {
  documents: DocumentItem[]
  loadError: boolean
  onOpen: (file: DocumentItem) => void
  onUpload: (file: File, category: string) => Promise<DocumentItem>
  onPreview: (file: DocumentItem) => Promise<string>
}) {
  const [category, setCategory] = useState('All files')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DocumentItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('Academic')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!selected) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selected])
  const categoryFiles = documents.filter(file => category === 'All files' || file.category === category)
  const search = query.trim().toLowerCase()
  const visibleDocuments = categoryFiles.filter(file => !search ||
    `${file.name} ${file.emailSubject} ${file.sender} ${file.noticeSummary ?? ''} ${file.extractedText ?? ''}`.toLowerCase().includes(search)
  )
  const visibleFiles = visibleDocuments.length
  const readyFiles = categoryFiles.filter(file => Boolean(file.extractedText)).length
  const closeUpload = () => {
    if (uploadBusy) return
    setUploadOpen(false)
    setUploadFile(null)
    setUploadError('')
    setDragActive(false)
  }
  const selectUploadFile = (file?: File) => {
    if (!file) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setUploadFile(null)
      setUploadError('Choose a PDF, JPG, or PNG file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadFile(null)
      setUploadError('The file must be 10 MB or smaller.')
      return
    }
    setUploadFile(file)
    setUploadError('')
  }
  const submitUpload = async () => {
    if (!uploadFile || uploadBusy) return
    setUploadBusy(true)
    setUploadError('')
    try {
      await onUpload(uploadFile, uploadCategory)
      setCategory(uploadCategory)
      closeUpload()
      setUploadOpen(false)
      setUploadFile(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload this document.')
    } finally {
      setUploadBusy(false)
    }
  }
  const moveFolder = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2))
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2))
    event.currentTarget.style.setProperty('--folder-follow-x', `${x * 4}px`)
    event.currentTarget.style.setProperty('--folder-follow-y', `${y * 2}px`)
    event.currentTarget.style.setProperty('--folder-tilt-x', `${y * -2}deg`)
    event.currentTarget.style.setProperty('--folder-tilt-y', `${x * 3}deg`)
    event.currentTarget.style.setProperty('--folder-shine-x', `${(x + 1) * 50}%`)
    event.currentTarget.style.setProperty('--folder-shine-y', `${(y + 1) * 50}%`)
  }
  const leaveFolder = (event: ReactPointerEvent<HTMLButtonElement>) => {
    setHoveredFolder(null)
    for (const property of ['--folder-follow-x', '--folder-follow-y', '--folder-tilt-x', '--folder-tilt-y', '--folder-shine-x', '--folder-shine-y']) {
      event.currentTarget.style.removeProperty(property)
    }
  }

  return (
    <div className="documents-page">
      <div className="page-intro">
        <div>
          <h1>Files</h1>
          <p>College attachments, organised and ready when you need them.</p>
        </div>
        <button className="document-add-button" type="button" onClick={() => setUploadOpen(true)}><UploadCloud size={16} /> Add document</button>
      </div>
      <div className="document-explorer-bar">
        <span className="document-breadcrumb"><FileText size={15} /> College files <b>/</b> {category}</span>
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
      <div className="document-explorer">
        <main className="document-explorer-main">
          <div className="document-explorer-heading"><h2>Folders</h2><span>{folders.length} folders</span></div>
          <div className="document-folders" aria-label="File folders">
            {folders.map(folder => {
              const count = folder.category === 'All files'
                ? documents.length
                : documents.filter(file => file.category === folder.category).length
              const active = category === folder.category
              return (
              <button
                type="button"
                key={folder.category}
                className={`document-folder${active ? ' selected' : ''}`}
                aria-pressed={active}
                onClick={() => setCategory(folder.category)}
                onPointerEnter={() => setHoveredFolder(folder.category)}
                onPointerMove={moveFolder}
                onPointerLeave={leaveFolder}
              >
                <FileFolder active={active} tone={folder.tone} hovered={hoveredFolder === folder.category} />
                <span className="document-folder-label">
                  <strong>{folder.label}</strong>
                  <small>{count} {count === 1 ? 'file' : 'files'}</small>
                </span>
              </button>
              )
            })}
          </div>
          <div className="document-panel">
            <div className="document-toolbar">
              <SectionHeading eyebrow={`${category.toUpperCase()} FOLDER`} title={`${visibleFiles} ${visibleFiles === 1 ? 'file' : 'files'}`} />
            </div>
            {visibleDocuments.length ? <div className="document-gallery">{visibleDocuments.map(file => <article className="document-gallery-card" key={file.id}>
              <button className="document-gallery-open" type="button" onClick={() => onOpen(file)} aria-label={`Open ${file.name}`}>
                <DocumentThumbnail file={file} onPreview={onPreview} />
              </button>
              <div className="document-gallery-copy">
                <span className="document-gallery-category">{file.category}</span>
                <strong title={file.name}>{file.name}</strong>
                <small>{file.type} · {file.size} · {formatDate(file.date)}</small>
              </div>
              <div className="document-gallery-actions">
                <button type="button" onClick={() => setSelected(file)}>Details</button>
                <button type="button" onClick={() => onOpen(file)} aria-label={`Open ${file.name}`}><ExternalLink size={15} /></button>
              </div>
            </article>)}</div> : (
              <EmptyState
                title={loadError ? 'Documents need setup' : documents.length ? 'No matching files' : 'No documents yet'}
                copy={loadError
                  ? 'The private attachment library is not connected yet.'
                  : documents.length ? 'Try another search or category.'
                  : 'PDFs and images from college emails will appear here after they are saved.'}
              />
            )}
          </div>
        </main>
        <aside className="document-inspector" aria-label="Folder information">
          <div className="document-inspector-title"><span>Info</span><small>{category}</small></div>
          <div className="document-inspector-card">
            <FileFolder active tone={folders.find(folder => folder.category === category)?.tone ?? 'blue'} />
            <strong>{category}</strong>
            <span>{categoryFiles.length} {categoryFiles.length === 1 ? 'file' : 'files'}</span>
          </div>
          <section>
            <h3>Properties</h3>
            <dl>
              <div><dt>Source</dt><dd>College email</dd></div>
              <div><dt>Text ready</dt><dd>{readyFiles}</dd></div>
              <div><dt>Updated</dt><dd>Automatically</dd></div>
            </dl>
          </section>
          <section>
            <h3>Folders</h3>
            <div className="document-inspector-tags">
              {folders.slice(1).map(folder => <button key={folder.category} onClick={() => setCategory(folder.category)}>{folder.label}</button>)}
            </div>
          </section>
        </aside>
      </div>
      {selected && createPortal(<div className="document-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="document-detail" role="dialog" aria-modal="true" aria-labelledby="document-detail-title">
          <div className="document-detail-header">
            <div><small>From {selected.sender} · {formatDate(selected.date)}</small><h2 id="document-detail-title">{topicFor(selected)}</h2><p>Attachment: {selected.name} · {selected.type} · {selected.size}</p></div>
            <button className="document-detail-close" aria-label="Close document details" onClick={() => setSelected(null)}><X size={19} /></button>
          </div>
          <div className="document-detail-body">
            {selected.noticeSummary && <section><h3>Email summary</h3><p>{selected.noticeSummary}</p></section>}
            <section><h3>Text read from file</h3>
              {selected.extractedText ? <pre>{selected.extractedText}</pre>
                : selected.emailSubject === 'Personal upload' ? <p>This is a personal upload. Open the original file to read it.</p>
                : <p>{selected.extractionStatus === 'Pending' ? 'This file is waiting for the attachment reader.'
                  : selected.extractionStatus === 'No text' ? 'The reader could not extract useful text from this file.'
                    : 'No extracted text is available yet. Open the original file to read it.'}</p>}
            </section>
          </div>
          <div className="document-detail-footer">
            <button onClick={() => onOpen(selected)}><ExternalLink size={15} /> Open original file</button>
            {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer"><Mail size={15} /> Open source email</a>}
          </div>
        </section>
      </div>, document.body)}
      {uploadOpen && createPortal(<div className="document-upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeUpload() }}>
        <section className="document-upload" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
          <header>
            <div><small>PERSONAL LIBRARY</small><h2 id="document-upload-title">Add a document</h2></div>
            <button type="button" aria-label="Close upload" onClick={closeUpload} disabled={uploadBusy}><X size={18} /></button>
          </header>
          <button
            type="button"
            className={`document-dropzone${dragActive ? ' is-dragging' : ''}`}
            onClick={() => uploadInput.current?.click()}
            onDragEnter={event => { event.preventDefault(); setDragActive(true) }}
            onDragOver={event => event.preventDefault()}
            onDragLeave={event => { event.preventDefault(); setDragActive(false) }}
            onDrop={event => { event.preventDefault(); setDragActive(false); selectUploadFile(event.dataTransfer.files[0]) }}
          >
            <span><UploadCloud size={26} /></span>
            <strong>{uploadFile ? 'Choose another file' : 'Drop your file here'}</strong>
            <small>PDF, JPG or PNG · Up to 10 MB</small>
          </button>
          <input ref={uploadInput} className="document-upload-input" type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => selectUploadFile(event.target.files?.[0])} />
          {uploadFile && <div className="document-upload-file">
            <span><FileText size={19} /></span>
            <div><strong>{uploadFile.name}</strong><small>{displayUploadSize(uploadFile.size)}</small></div>
            <button type="button" aria-label="Remove selected file" onClick={() => setUploadFile(null)} disabled={uploadBusy}><X size={16} /></button>
          </div>}
          <label className="document-upload-category"><span>Save in folder</span><select value={uploadCategory} onChange={event => setUploadCategory(event.target.value)} disabled={uploadBusy}>{folders.slice(1).map(folder => <option key={folder.category}>{folder.category}</option>)}</select></label>
          {uploadError && <p className="document-upload-error" role="alert">{uploadError}</p>}
          <footer>
            <button type="button" className="document-upload-cancel" onClick={closeUpload} disabled={uploadBusy}>Cancel</button>
            <button type="button" className="document-upload-submit" onClick={() => void submitUpload()} disabled={!uploadFile || uploadBusy}>{uploadBusy ? 'Uploading…' : 'Add document'}</button>
          </footer>
        </section>
      </div>, document.body)}
    </div>
  )
}
