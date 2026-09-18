import { useEffect } from 'react'
import { FolderOpen, X } from 'lucide-react'

export const badge = (value: string) => (
  <span
    className={`badge badge-${value
      .toLowerCase()
      .replaceAll(' ', '-')}`}
  >
    {value}
  </span>
)

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>

      {action}
    </div>
  )
}

export function EmptyState({
  title,
  copy,
}: {
  title: string
  copy: string
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={28} />
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  )
}

export function PageIntro({
  title,
  copy,
}: {
  title: string
  copy: string
}) {
  return (
    <div className="page-intro">
      <div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  className?: string
}) {
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <strong>{title}</strong>

          <button
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}