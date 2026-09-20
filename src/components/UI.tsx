import * as DialogPrimitive from '@radix-ui/react-dialog'
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
  return (
    <DialogPrimitive.Root open onOpenChange={open => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-backdrop" />
        <DialogPrimitive.Content className={`modal ${className}`}>
        <div className="modal-header">
          <DialogPrimitive.Title asChild><strong>{title}</strong></DialogPrimitive.Title>

          <button
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="modal-content">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
