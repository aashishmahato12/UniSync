import './Documents.css'
import { useRef, useState } from 'react'
import {
  FileText,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'

import {
  formatDate,
  today,
  type DocumentItem,
} from '../data'

import {
  EmptyState,
  SectionHeading,
} from '../components/UI'

export default function Documents({
  documents,
  setDocuments,
  notify,
}: {
  documents: DocumentItem[]
  setDocuments: React.Dispatch<
    React.SetStateAction<DocumentItem[]>
  >
  notify: (message: string) => void
}) {
  const [category, setCategory] = useState('All files')
  const [query, setQuery] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  const categories = [
    'All files',
    'Academic',
    'Finance',
    'Forms',
    'Personal',
  ]

  const filtered = documents.filter(
    document =>
      (category === 'All files' ||
        document.category === category) &&
      document.name
        .toLowerCase()
        .includes(query.toLowerCase())
  )

  const upload = (file?: File) => {
    if (!file) return

    setDocuments(previous => [
      {
        id: `d${Date.now()}`,
        name: file.name,
        category: 'Personal',
        date: today,
        size: `${Math.max(
          1,
          Math.round(file.size / 1024)
        )} KB`,
        type: file.type.includes('image') ? 'Image' : 'File',
      },
      ...previous,
    ])

    notify('File added locally.')
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Documents</h1>
          <p>Forms, routines, receipts and files.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => inputRef.current?.click()}
        >
          <Plus size={17} />
          Add document
        </button>

        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={e => upload(e.target.files?.[0])}
        />
      </div>

      <div className="document-categories">
        {categories.slice(1).map(item => (
          <button
            key={item}
            className={
              category === item ? 'selected' : ''
            }
            onClick={() =>
              setCategory(
                category === item ? 'All files' : item
              )
            }
          >
            <span className="folder-icon">
              <FolderOpen size={21} />
            </span>

            <strong>{item}</strong>

            <small>
              {
                documents.filter(
                  document => document.category === item
                ).length
              }{' '}
              files
            </small>
          </button>
        ))}
      </div>

      <div className="panel document-panel">
        <div className="document-toolbar">
          <SectionHeading title="All documents" />

          <div className="document-search">
            <Search size={16} />

            <input
              placeholder="Search files"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="document-table-head">
          <span>NAME</span>
          <span>CATEGORY</span>
          <span>ADDED</span>
          <span>SIZE</span>
          <span />
        </div>

        {filtered.length ? (
          filtered.map(document => (
            <div
              className="document-row"
              key={document.id}
            >
              <div className="document-name">
                <span className="document-icon">
                  <FileText size={19} />
                </span>

                <div>
                  <strong>{document.name}</strong>
                  <small>{document.type}</small>
                </div>
              </div>

              <span>{document.category}</span>
              <span>{formatDate(document.date)}</span>
              <span>{document.size}</span>

              <button
                onClick={() =>
                  notify('Storage integration coming later.')
                }
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            title="No documents"
            copy="No files match your search."
          />
        )}
      </div>
    </>
  )
}