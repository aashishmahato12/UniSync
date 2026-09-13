import { useRef, useState } from 'react'
import { AlertCircle, CreditCard, ShieldCheck, UploadCloud } from 'lucide-react'
import { badge, EmptyState, Modal, PageIntro, SectionHeading } from '../components/UI'
import { formatDate, money, paymentScheduleTotals, today, type Payment } from '../data'
import './Payments.css'

const dateText = (payment: Payment) =>
  payment.dueDate
    ? formatDate(payment.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })
    : payment.dateLabel

const draftBody = (payment: Payment) =>
  `Dear Accounts Office,

I have paid the ${payment.title} fee through mobile banking. Please find my payment receipt attached for your records.

Kindly confirm when the payment has been received.

Thank you,
Aashish Mahato`

export default function Payments({
  payments,
  notify,
}: {
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
  const [body, setBody] = useState(firstPayment ? draftBody(firstPayment) : '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = payments.find(p => p.id === selectedPayment) || firstPayment

  const choosePayment = (id: string) => {
    const payment = payments.find(p => p.id === id)
    if (!payment) return
    setSelectedPayment(id)
    setAmount(String(payment.amount))
    setBody(draftBody(payment))
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
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
    <>
      <PageIntro
        title="Payments"
        copy="Your Autumn 2026 batch fee schedule, with a place to prepare payment receipts."
      />

      <div className="payment-stats">
        <div><span>FULL PROGRAM PLAN</span><strong>{money(paymentScheduleTotals.total)}</strong><small>Admission + six semesters</small></div>
        <div><span>NEXT TENTATIVE DATE</span><strong>{nextPayment ? dateText(nextPayment) : 'Check with college'}</strong><small>{nextPayment?.title || 'No later date in this schedule'}</small></div>
        <div><span>NOT MARKED PAID</span><strong>{money(remaining)}</strong><small>No payments confirmed in this app</small></div>
      </div>

      <section className="panel schedule-panel">
        <SectionHeading eyebrow="AUTUMN 2026 BATCH" title="Fee payment schedule" />
        <div className="schedule-note"><AlertCircle size={18} /><span>These are tentative dates from your printed schedule, not confirmed deadlines. The college says changes will be communicated at least 15 days before a fee payment date. Check the latest college notice before paying.</span></div>
        <div className="schedule-list">
          {payments.map(payment => (
            <button
              className={`schedule-row ${selectedPayment === payment.id ? 'selected' : ''}`}
              key={payment.id}
              onClick={() => choosePayment(payment.id)}
            >
              <span className="schedule-period">
                <span className="schedule-year">{payment.year ? `YEAR ${payment.year} · SEMESTER ${payment.semester}` : 'ONE-TIME'}</span>
                <strong>{payment.title}</strong>
                <small>{payment.details}</small>
              </span>
              <span className="schedule-date"><small>TENTATIVE DATE</small><strong>{dateText(payment)}</strong><small>{payment.dateLabel}</small></span>
              <span className="schedule-breakdown">
                {payment.admissionFee > 0 && <small>Admission {money(payment.admissionFee)}</small>}
                {payment.universityExamFee > 0 && <small>University & exam {money(payment.universityExamFee)}</small>}
                {payment.collegeFee > 0 && <small>College {money(payment.collegeFee)}</small>}
              </span>
              <span className="schedule-amount"><strong>{money(payment.amount)}</strong>{badge(payment.status)}</span>
            </button>
          ))}
        </div>
        <div className="schedule-totals">
          <span>Admission <strong>{money(paymentScheduleTotals.admissionFee)}</strong></span>
          <span>University & exam <strong>{money(paymentScheduleTotals.universityExamFee)}</strong></span>
          <span>College <strong>{money(paymentScheduleTotals.collegeFee)}</strong></span>
          <span>Grand total <strong>{money(paymentScheduleTotals.total)}</strong></span>
        </div>
        <p className="schedule-footnote">The admission and registration fee is one-time and non-refundable. The printed plan says university and semester fees should be paid before the start of each semester.</p>
      </section>

      <div className="payment-layout">
        <section className="panel payment-form-panel">
          <SectionHeading eyebrow="PAYMENT PROOF" title="Prepare a receipt email" />
          <div className="demo-note"><AlertCircle size={17} /><span>Email sending is not connected. You can fill in and preview a draft here, but it will not be sent or saved. Your selected file stays on this device.</span></div>
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
          <div className="form-actions"><button className="primary-button" onClick={() => setPreview(true)}>Preview email</button></div>
        </section>

        <aside className="panel payment-history">
          <SectionHeading eyebrow="PAYMENT RECORD" title="Current status" />
          <div className="history-list">
            {payments.map(p => (
              <button className={`history-row ${selectedPayment === p.id ? 'selected' : ''}`} key={p.id} onClick={() => choosePayment(p.id)}>
                <span className="history-icon"><CreditCard size={18} /></span>
                <span><strong>{p.title}</strong><small>{dateText(p)} · {money(p.amount)}</small>{p.transactionId && <small>Txn: {p.transactionId}</small>}</span>
                {badge(p.status)}
              </button>
            ))}
          </div>
          <div className="history-help"><ShieldCheck size={19} /><p>All entries begin as “Due” because this printed schedule does not confirm which payments you have made. Keep your original receipts until the college confirms each payment.</p></div>
        </aside>
      </div>

      {preview && (
        <Modal title="Email preview" onClose={() => setPreview(false)}>
          <div className="email-preview">
            <div><span>To</span><strong>Accounts Office · address not configured</strong></div>
            <div><span>Subject</span><strong>Payment receipt — {selected.title}</strong></div>
            <div><span>Details</span><strong>{money(Number(amount) || 0)} · {paidOn ? formatDate(paidOn, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date missing'} · {transactionId || 'Transaction ID missing'} · {paymentType}</strong></div>
            <div><span>Attachment</span><strong>{file?.name || 'No receipt attached'}</strong></div>
            <pre>{body}</pre>
          </div>
          <div className="demo-note"><AlertCircle size={17} /><span>This is a preview only. No email or attachment has been sent.</span></div>
          <div className="modal-actions"><button className="secondary-button" onClick={() => setPreview(false)}>Edit details</button></div>
        </Modal>
      )}
    </>
  )
}
