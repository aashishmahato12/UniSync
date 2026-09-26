import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, ExternalLink, Mail, RefreshCw, Send, UploadCloud, WalletCards, X, XCircle } from 'lucide-react'
import { EmptyState, Modal, PageIntro, SectionHeading } from '../components/UI'
import { formatDate, money, paymentScheduleTotals, today, type Payment } from '../data'
import {
  getReceiptJobs,
  getReceiptSendingSettings,
  queueReceipt,
  type ReceiptJob,
  type ReceiptSendingSettings,
} from '../services/paymentReceipts'
import './Payments.css'

const dateText = (payment: Payment) =>
  payment.dueDate
    ? formatDate(payment.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })
    : payment.dateLabel

const draftBody = (payment: Payment, studentName: string) =>
  `Dear Accounts Office,

I have paid the ${payment.title} fee through mobile banking. Please find my payment receipt attached for your records.

Kindly confirm when the payment has been received.

Thank you,
${studentName}`

const deliveryLabel = (job: ReceiptJob) => job.status === 'queued' ? 'Queued'
  : job.status === 'processing' ? 'Sending'
    : job.status === 'sent' && job.gmail_message_id ? 'Sent'
      : job.status === 'sent' ? 'Check delivery' : 'Failed'

const deliveryTitle = (job: ReceiptJob) => job.status === 'queued' ? 'Receipt queued'
  : job.status === 'processing' ? 'Sending your email…'
    : job.status === 'sent' && job.gmail_message_id ? 'Email sent'
      : job.status === 'sent' ? 'Delivery needs checking' : 'Email not sent'

const deliveryCopy = (job: ReceiptJob) => job.status === 'queued'
  ? 'Your receipt is saved and waiting for the n8n email workflow. It has not been sent yet.'
  : job.status === 'processing'
    ? 'n8n is handling your receipt. Wait for Gmail to confirm delivery before treating it as sent.'
    : job.status === 'sent' && job.gmail_message_id
      ? 'Gmail accepted the email. Keep the receipt until the college confirms your payment.'
      : job.status === 'sent'
        ? 'This job is marked sent, but no Gmail message ID was saved. Check Gmail Sent and the n8n run.'
        : job.error_message || 'Delivery failed. Check the n8n run and Gmail Sent before trying again.'

export default function Payments({
  studentName,
  payments,
  setPayments,
  notify,
}: {
  studentName: string
  payments: Payment[]
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>
  notify: (message: string) => void
}) {
  const firstPayment = payments.find(p => p.dueDate) || payments[0]
  const [selectedPayment, setSelectedPayment] = useState(firstPayment?.id || '')
  const [amount, setAmount] = useState(String(firstPayment?.amount || ''))
  const [paidOn, setPaidOn] = useState(today)
  const [transactionId, setTransactionId] = useState('')
  const [paymentType, setPaymentType] = useState('Mobile banking')
  const [body, setBody] = useState(firstPayment ? draftBody(firstPayment, studentName) : '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSendingSettings | null>(null)
  const [receiptJobs, setReceiptJobs] = useState<ReceiptJob[]>([])
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null)
  const [receiptSetupError, setReceiptSetupError] = useState(false)
  const [sending, setSending] = useState(false)
  const [refreshingJobs, setRefreshingJobs] = useState(false)
  const [showAllReceiptJobs, setShowAllReceiptJobs] = useState(false)

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const [settings, jobs] = await Promise.all([
          getReceiptSendingSettings(),
          getReceiptJobs(),
        ])
        if (!active) return
        setReceiptSettings(settings)
        setReceiptJobs(jobs)
        setReceiptSetupError(false)
      } catch {
        if (active) setReceiptSetupError(true)
      }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, trackedJobId ? 5000 : 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [trackedJobId])

  useEffect(() => {
    if (!trackedJobId) return
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setTrackedJobId(null) }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [trackedJobId])

  const refreshDelivery = async () => {
    if (refreshingJobs) return
    setRefreshingJobs(true)
    try {
      setReceiptJobs(await getReceiptJobs())
      setReceiptSetupError(false)
    } catch {
      notify('Could not refresh email status. Please try again.')
    } finally {
      setRefreshingJobs(false)
    }
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const selected = payments.find(p => p.id === selectedPayment) || firstPayment
  const testRecipient = receiptSettings?.recipient_label?.toLowerCase() === 'aashishmahato8000@gmail.com'
  const sendLabel = testRecipient ? 'Send test receipt' : 'Send receipt'
  const trackedJob = receiptJobs.find(job => job.id === trackedJobId)
  const sortedReceiptJobs = [...receiptJobs].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const visibleReceiptJobs = showAllReceiptJobs ? sortedReceiptJobs : sortedReceiptJobs.slice(0, 5)

  const choosePayment = (id: string) => {
    const payment = payments.find(p => p.id === id)
    if (!payment) return
    setSelectedPayment(id)
    setAmount(String(payment.amount))
    setBody(draftBody(payment, studentName))
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const setStatus = (id: string, status: 'Due' | 'Paid') => {
    setPayments(current => current.map(payment =>
      payment.id === id ? { ...payment, status } : payment
    ))
    notify(status === 'Paid' ? 'Marked Paid by you. This is not a college confirmation.' : 'Marked Due by you.')
  }

  const onFile = (picked?: File) => {
    if (!picked) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(picked.type)) {
      notify('Please choose a PDF, JPG, or PNG receipt.')
      return
    }
    if (picked.size > 10 * 1024 * 1024) {
      notify('Please choose a file smaller than 10 MB.')
      return
    }
    setFile(picked)
    notify('Receipt attached to your draft on this device.')
  }

  const submit = async () => {
    if (!receiptSettings?.enabled || !receiptSettings.recipient_label) {
      notify('Receipt sending is not connected yet.')
      return
    }
    if (!file || !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
        !paidOn || transactionId.trim().length < 3 || !body.trim()) {
      notify('Add a receipt, a positive amount, payment date, transaction ID, and email body.')
      return
    }
    if (sending) return
    setSending(true)
    try {
      const job = await queueReceipt({
        paymentId: selectedPayment,
        paymentTitle: selected.title,
        amount: Number(amount),
        paidOn,
        transactionId,
        paymentType,
        body,
        file,
      })
      setReceiptJobs(current => [job, ...current])
      setPreview(false)
      setTrackedJobId(job.id)
      notify(testRecipient
        ? 'Test receipt queued for your inbox. This is not a college submission.'
        : 'Receipt queued for n8n. Check its status here before assuming it was sent.')
    } catch (error) {
      const duplicate = typeof error === 'object' && error !== null &&
        'code' in error && error.code === '23505'
      notify(duplicate
        ? 'That transaction ID already has a receipt request. Check its status below.'
        : 'Could not queue the receipt. Nothing was emailed; please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!selected) {
    return <EmptyState title="No payments" copy="Payment information will appear here." />
  }

  const nextPayment = payments
    .filter(p => p.dueDate && p.dueDate >= today && p.status === 'Due')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0]
  const remaining = payments
    .filter(p => p.status !== 'Confirmed' && p.status !== 'Paid')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="payments-page">
      <PageIntro
        title="Payments"
        copy="Prepare and track payment receipts, with your fee plan kept nearby for reference."
      />

      <div className="payment-stats">
        <div className="payment-stat-card total"><span className="payment-stat-icon"><WalletCards size={20} /></span><span>FULL PROGRAM PLAN</span><strong>{money(paymentScheduleTotals.total)}</strong><small>Admission + six semesters</small></div>
        <div className="payment-stat-card next"><span className="payment-stat-icon"><CalendarClock size={20} /></span><span>NEXT TENTATIVE DATE</span><strong>{nextPayment ? dateText(nextPayment) : 'Check with college'}</strong><small>{nextPayment?.title || 'No later date in this schedule'}</small></div>
        <div className="payment-stat-card remaining"><span className="payment-stat-icon"><CircleDollarSign size={20} /></span><span>NOT MARKED PAID</span><strong>{money(remaining)}</strong><small>Based on your Due / Paid choices</small></div>
      </div>

      <section className="panel schedule-panel">
        <SectionHeading eyebrow="AUTUMN 2026 BATCH" title="Fee plan" />
        <div className="schedule-note"><AlertCircle size={18} /><span>Batch fee amounts are shared. Your Paid / Due choices are private to this account on this device. Dates are tentative; check the latest college notice before paying.</span></div>
        <div className="schedule-list">
          {payments.map(payment => (
            <div
              className={`schedule-row ${selectedPayment === payment.id ? 'selected' : ''}`}
              key={payment.id}
            >
              <span className="schedule-period">
                <span className="schedule-year">{payment.year ? `YEAR ${payment.year} · SEMESTER ${payment.semester}` : 'ONE-TIME'}</span>
                <strong>{payment.title}</strong>
                <small>{payment.details}</small>
              </span>
              <span className="schedule-date"><small>{payment.dueDate ? 'TENTATIVE DATE' : 'WHEN'}</small><strong>{dateText(payment)}</strong>{payment.dueDate && <small>{payment.dateLabel}</small>}</span>
              <span className="schedule-breakdown">
                {payment.admissionFee > 0 && <small>Admission {money(payment.admissionFee)}</small>}
                {payment.universityExamFee > 0 && <small>University & exam {money(payment.universityExamFee)}</small>}
                {payment.collegeFee > 0 && <small>College {money(payment.collegeFee)}</small>}
              </span>
              <span className="schedule-amount">
                <strong>{money(payment.amount)}</strong>
                <select
                  className={`payment-status-select ${payment.status === 'Paid' ? 'is-paid' : ''}`}
                  aria-label={`Status for ${payment.title}`}
                  value={payment.status}
                  onChange={event => setStatus(payment.id, event.target.value as 'Due' | 'Paid')}
                >
                  <option value="Due">Due</option>
                  <option value="Paid">Paid by me</option>
                </select>
                <button type="button" className="payment-pick-button" onClick={() => choosePayment(payment.id)}>Use for receipt</button>
              </span>
            </div>
          ))}
        </div>
        <div className="schedule-totals">
          <span>Admission <strong>{money(paymentScheduleTotals.admissionFee)}</strong></span>
          <span>University & exam <strong>{money(paymentScheduleTotals.universityExamFee)}</strong></span>
          <span>College <strong>{money(paymentScheduleTotals.collegeFee)}</strong></span>
          <span>Grand total <strong>{money(paymentScheduleTotals.total)}</strong></span>
        </div>
        <p className="schedule-footnote">“Paid by me” is your private record until the college confirms the payment.</p>
      </section>

      <div className="payment-layout">
        <section className="panel payment-form-panel">
          <SectionHeading eyebrow="PAYMENT PROOF" title="Prepare a receipt email" />
          <div className="demo-note"><AlertCircle size={17} /><span>{receiptSettings?.enabled && receiptSettings.recipient_label
            ? testRecipient
              ? `Test mode: receipts go to your inbox (${receiptSettings.recipient_label}), not the college. Check the status below after sending.`
              : `Ready to queue through n8n for ${receiptSettings.recipient_label}. A receipt is only marked Sent after Gmail accepts it.`
            : receiptSetupError
              ? 'Receipt sending needs the Supabase setup. Your draft has not been sent.'
              : 'Receipt sending is waiting for the college email address and n8n setup. You can still prepare a draft.'}</span></div>
          <div className="form-grid">
            <label className="field full"><span>Payment for</span><select value={selectedPayment} onChange={e => choosePayment(e.target.value)}>{payments.map(p => <option key={p.id} value={p.id}>{p.title} · {money(p.amount)}</option>)}</select></label>
            <label className="field"><span>Amount paid (NPR)</span><input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
            <label className="field"><span>Payment date</span><input type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} /></label>
            <label className="field"><span>Transaction ID</span><input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="From your banking receipt" /></label>
            <label className="field"><span>Payment type</span><select value={paymentType} onChange={e => setPaymentType(e.target.value)}><option>Mobile banking</option><option>Bank transfer</option><option>eSewa</option><option>Khalti</option><option>Other</option></select></label>
            <div className="field full">
              <span>Receipt</span>
              <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => onFile(e.target.files?.[0])} />
              <button type="button" className={`upload-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
                <UploadCloud size={23} />
                <strong>{file ? file.name : 'Click to choose or drag a receipt here'}</strong>
                <small>{file ? `${(file.size / 1024).toFixed(0)} KB · Click to replace` : 'PDF, JPG or PNG · Up to 10 MB'}</small>
              </button>
            </div>
            <label className="field full"><span>Email body</span><textarea rows={8} value={body} onChange={e => setBody(e.target.value)} /></label>
          </div>
          <div className="form-actions">
            <button className="secondary-button" onClick={() => setPreview(true)}>Preview email</button>
            <button className="primary-button" onClick={submit} disabled={!receiptSettings?.enabled || !receiptSettings.recipient_label || sending}>
              {sending ? 'Queuing…' : sendLabel} <Send size={16} />
            </button>
          </div>
        </section>

      </div>

      <section className="panel receipt-delivery-panel">
        <div className="receipt-delivery-heading">
          <SectionHeading eyebrow="EMAIL DELIVERY" title="Receipt email status" />
          <div className="receipt-delivery-actions">
            {receiptJobs.length > 5 && <button className="receipt-list-toggle" type="button" onClick={() => setShowAllReceiptJobs(value => !value)}>
              {showAllReceiptJobs ? 'Latest 5' : `Show all ${receiptJobs.length}`}
            </button>}
            <button className="secondary-button" onClick={() => void refreshDelivery()} disabled={refreshingJobs}><RefreshCw size={15} /> {refreshingJobs ? 'Checking…' : 'Check status'}</button>
          </div>
        </div>
        <p className="receipt-delivery-intro">Showing {showAllReceiptJobs ? 'all' : 'the latest five'} emails sent through n8n and Gmail. College payment confirmation is separate.</p>
        {trackedJob && <div className="receipt-status-inline">
          <section className="receipt-status-sheet" aria-labelledby="receipt-status-title" aria-live="polite">
            <button className="receipt-status-close" aria-label="Close email status" onClick={() => setTrackedJobId(null)}><X size={18} /></button>
            <span className={`receipt-status-symbol ${trackedJob.status === 'sent' && trackedJob.gmail_message_id ? 'sent' : trackedJob.status === 'failed' ? 'failed' : 'pending'}`}>
              {trackedJob.status === 'sent' && trackedJob.gmail_message_id ? <CheckCircle2 size={36} /> : trackedJob.status === 'failed' ? <XCircle size={36} /> : trackedJob.status === 'processing' ? <Send size={34} /> : <Clock3 size={34} />}
            </span>
            <span className="receipt-status-eyebrow">PAYMENT RECEIPT EMAIL</span>
            <h2 id="receipt-status-title">{deliveryTitle(trackedJob)}</h2>
            <p>{deliveryCopy(trackedJob)}</p>
            <div className="receipt-status-progress" aria-label={`Email status: ${deliveryLabel(trackedJob)}`}>
              <span className="done" /><span className={trackedJob.status !== 'queued' ? 'done' : ''} /><span className={trackedJob.status === 'sent' && trackedJob.gmail_message_id ? 'done' : ''} />
            </div>
            <div className="receipt-status-steps"><span>Queued</span><span>Processing</span><span>Sent</span></div>
            <div className="receipt-status-reference"><span>Transaction ID</span><strong>{trackedJob.transaction_id}</strong>{trackedJob.sent_at && <small>Sent {new Date(trackedJob.sent_at).toLocaleString()}</small>}</div>
            {trackedJob.gmail_message_id && <a className="receipt-status-gmail" href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(trackedJob.gmail_message_id)}`} target="_blank" rel="noopener noreferrer">Open in Gmail <ExternalLink size={15} /></a>}
            <button className="receipt-status-done" onClick={() => setTrackedJobId(null)}>{trackedJob.status === 'queued' || trackedJob.status === 'processing' ? 'Continue while it sends' : 'Done'}</button>
          </section>
        </div>}
        {receiptJobs.length ? <div className="receipt-delivery-list">{visibleReceiptJobs.map(job => {
          const payment = payments.find(item => item.id === job.payment_id)
          return <div className="receipt-delivery-row" key={job.id}>
            <span className={`receipt-delivery-icon ${job.status === 'sent' && job.gmail_message_id ? 'sent' : job.status === 'failed' ? 'failed' : 'pending'}`}>
              {job.status === 'sent' && job.gmail_message_id ? <CheckCircle2 size={20} /> : job.status === 'failed' ? <XCircle size={20} /> : <Clock3 size={20} />}
            </span>
            <span className="receipt-delivery-details"><strong>{payment?.title || job.payment_id}</strong><small>Transaction {job.transaction_id} · {new Date(job.created_at).toLocaleString()}</small><small>{deliveryCopy(job)}</small></span>
            <span className={`receipt-delivery-badge ${job.status === 'sent' && job.gmail_message_id ? 'sent' : job.status === 'failed' ? 'failed' : 'pending'}`}>{deliveryLabel(job)}</span>
            <button className="receipt-delivery-view" onClick={() => setTrackedJobId(job.id)}>Details</button>
          </div>
        })}</div> : <div className="receipt-delivery-empty"><Mail size={18} /> No receipt emails queued yet.</div>}
      </section>

      {preview && (
        <Modal title="Email preview" onClose={() => setPreview(false)}>
          <div className="email-preview">
            <div><span>To</span><strong>{receiptSettings?.recipient_label || 'Accounts Office · address not configured'}</strong></div>
            <div><span>Subject</span><strong>Herald College payment receipt — {selected.title}</strong></div>
            <div><span>Details</span><strong>{money(Number(amount) || 0)} · {paidOn ? formatDate(paidOn, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date missing'} · {transactionId || 'Transaction ID missing'} · {paymentType}</strong></div>
            <div><span>Attachment</span><strong>{file?.name || 'No receipt attached'}</strong></div>
            <pre>{body}</pre>
          </div>
          <div className="demo-note"><AlertCircle size={17} /><span>{testRecipient
            ? 'Test mode: this email is addressed to your inbox, not the college. Sending queues it in Supabase for n8n.'
            : 'This is a preview. Sending queues the receipt in Supabase; n8n will deliver it through Gmail.'}</span></div>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setPreview(false)}>Edit details</button>
            <button className="primary-button" onClick={submit} disabled={!receiptSettings?.enabled || !receiptSettings.recipient_label || sending}>
              {sending ? 'Queuing…' : sendLabel} <Send size={16} />
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}
