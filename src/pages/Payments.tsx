import { useRef, useState } from 'react'
import './Payments.css'
import {
  AlertCircle,
  CreditCard,
  Send,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'

import {
  money,
  today,
  formatDate,
  type Payment,
} from '../data'

import {
    EmptyState,
  Modal,
  PageIntro,
  SectionHeading,
  badge,
} from '../components/UI'

import {
  studentService,
  type ReceiptSubmission,
} from '../services/mockService'

const fullDate = (date: string) =>
  formatDate(date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  export default function Payments({
    payments,
    setPayments,
    notify,
  }: {
    payments: Payment[]
    setPayments: React.Dispatch<
      React.SetStateAction<Payment[]>
    >
    notify: (message: string) => void
  }) {
    const [
      selectedPayment,
      setSelectedPayment,
    ] = useState(
      payments[0]?.id || ''
    )
  
    const [amount, setAmount] =
      useState(
        String(
          payments[0]?.amount || ''
        )
      )
  
    const [paidOn, setPaidOn] =
      useState(today)
  
    const [
      transactionId,
      setTransactionId,
    ] = useState('')
  
    const [
      paymentType,
      setPaymentType,
    ] = useState('Mobile banking')
  
    const [body, setBody] =
      useState(
        `Dear Accounts Office,
  
  I have paid my semester tuition through mobile banking. Please find the receipt attached for your records.
  
  Kindly confirm when the payment has been received.
  
  Thank you,
  Aashish Mahato`
      )
  
    const [file, setFile] =
      useState<File | null>(null)
  
    const [preview, setPreview] =
      useState(false)
  
    const [sending, setSending] =
      useState(false)
  
    const [sent, setSent] =
      useState(false)
  
    const inputRef =
      useRef<HTMLInputElement>(null)
  
    const selected =
      payments.find(
        p => p.id === selectedPayment
      ) || payments[0]
  
    const changePayment = (
      id: string
    ) => {
      setSelectedPayment(id)
  
      setAmount(
        String(
          payments.find(
            p => p.id === id
          )?.amount || ''
        )
      )
  
      setSent(false)
    }
  
    const onFile = (
      picked?: File
    ) => {
      if (!picked) return
  
      if (
        ![
          'application/pdf',
          'image/jpeg',
          'image/png',
        ].includes(picked.type)
      ) {
        notify(
          'Please choose a PDF, JPG, or PNG receipt.'
        )
        return
      }
  
      if (
        picked.size >
        10 * 1024 * 1024
      ) {
        notify(
          'Please choose a file smaller than 10 MB.'
        )
        return
      }
  
      setFile(picked)
  
      setPayments(prev =>
        prev.map(p =>
          p.id ===
            selectedPayment &&
          p.status === 'Due'
            ? {
                ...p,
                status:
                  'Receipt Uploaded',
              }
            : p
        )
      )
  
      notify(
        'Receipt attached to your draft.'
      )
    }
  
    const submit = async () => {
      if (
        !file ||
        !amount ||
        !paidOn ||
        !transactionId.trim() ||
        !body.trim()
      ) {
        notify(
          'Complete the details and attach a receipt before sending.'
        )
        return
      }
  
      setSending(true)
  
      const payload: ReceiptSubmission =
        {
          paymentId:
            selectedPayment,
          amount: Number(amount),
          paidOn,
          transactionId,
          paymentType,
          body,
          fileName: file.name,
        }
  
      await studentService.submitReceipt(
        payload
      )
  
      setPayments(prev =>
        prev.map(p =>
          p.id === selectedPayment
            ? {
                ...p,
                status:
                  'Receipt Sent',
                transactionId,
              }
            : p
        )
      )
  
      setSending(false)
      setSent(true)
      setPreview(false)
  
      notify(
        'Demo submission saved. Email automation will be connected next.'
      )
    }
  
    if (!selected) {
      return (
        <EmptyState
          title="No payments"
          copy="Payment information will appear here."
        />
      )
    }
  
    return (
      <>
        <PageIntro
          title="Payments"
          copy="Keep fee deadlines and proof of payment together."
        />
  
        <div className="payment-stats">
  
          <div>
            <span>
              UPCOMING DUE
            </span>
  
            <strong>
              {money(
                payments
                  .filter(p =>
                    [
                      'Due',
                      'Receipt Uploaded',
                    ].includes(
                      p.status
                    )
                  )
                  .reduce(
                    (sum, p) =>
                      sum +
                      p.amount,
                    0
                  )
              )}
            </strong>
  
            <small>
              Payment deadlines
            </small>
          </div>
  
          <div>
            <span>
              AWAITING CONFIRMATION
            </span>
  
            <strong>
              {
                payments.filter(p =>
                  [
                    'Receipt Sent',
                    'Awaiting Confirmation',
                  ].includes(
                    p.status
                  )
                ).length
              }
            </strong>
  
            <small>
              Receipt status updates
            </small>
          </div>
  
          <div>
            <span>
              CONFIRMED
            </span>
  
            <strong>
              {
                payments.filter(
                  p =>
                    p.status ===
                    'Confirmed'
                ).length
              }
            </strong>
  
            <small>
              Completed payments
            </small>
          </div>
        </div>
  
        <div className="payment-layout">
  
          <section className="panel payment-form-panel">
  
            <SectionHeading
              eyebrow="SEND A PAYMENT RECEIPT"
              title="Receipt details"
            />
  
            <div className="demo-note">
              <AlertCircle
                size={17}
              />
  
              <span>
                Receipt email
                automation is not
                connected yet.
              </span>
            </div>
  
            <div className="form-grid">
  
              <label className="field full">
                <span>
                  Payment for
                </span>
  
                <select
                  value={
                    selectedPayment
                  }
                  onChange={e =>
                    changePayment(
                      e.target.value
                    )
                  }
                >
                  {payments.map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
  
              <label className="field">
                <span>
                  Amount paid (NPR)
                </span>
  
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={e =>
                    setAmount(
                      e.target.value
                    )
                  }
                />
              </label>
  
              <label className="field">
                <span>
                  Payment date
                </span>
  
                <input
                  type="date"
                  value={paidOn}
                  onChange={e =>
                    setPaidOn(
                      e.target.value
                    )
                  }
                />
              </label>
  
              <label className="field">
                <span>
                  Transaction ID
                </span>
  
                <input
                  value={
                    transactionId
                  }
                  onChange={e =>
                    setTransactionId(
                      e.target.value
                    )
                  }
                  placeholder="e.g. MB-842791"
                />
              </label>
  
              <label className="field">
                <span>
                  Payment type
                </span>
  
                <select
                  value={
                    paymentType
                  }
                  onChange={e =>
                    setPaymentType(
                      e.target.value
                    )
                  }
                >
                  <option>
                    Mobile banking
                  </option>
  
                  <option>
                    Bank transfer
                  </option>
  
                  <option>
                    eSewa
                  </option>
  
                  <option>
                    Khalti
                  </option>
  
                  <option>
                    Other
                  </option>
                </select>
              </label>
  
              <div className="field full">
                <span>
                  Receipt
                </span>
  
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hidden
                  onChange={e =>
                    onFile(
                      e.target
                        .files?.[0]
                    )
                  }
                />
  
                <button
                  className={`upload-zone ${
                    file
                      ? 'has-file'
                      : ''
                  }`}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  onDragOver={e =>
                    e.preventDefault()
                  }
                  onDrop={e => {
                    e.preventDefault()
  
                    onFile(
                      e.dataTransfer
                        .files[0]
                    )
                  }}
                >
                  <UploadCloud
                    size={23}
                  />
  
                  <strong>
                    {file
                      ? file.name
                      : 'Click to upload or drag a file here'}
                  </strong>
  
                  <small>
                    {file
                      ? `${(
                          file.size /
                          1024
                        ).toFixed(
                          0
                        )} KB · Click to replace`
                      : 'PDF, JPG or PNG · Up to 10 MB'}
                  </small>
                </button>
              </div>
  
              <label className="field full">
                <span>
                  Email body
                </span>
  
                <textarea
                  rows={8}
                  value={body}
                  onChange={e =>
                    setBody(
                      e.target.value
                    )
                  }
                />
              </label>
            </div>
  
            <div className="form-actions">
  
              <button
                className="secondary-button"
                onClick={() =>
                  setPreview(true)
                }
              >
                Preview email
              </button>
  
              <button
                className="primary-button"
                onClick={submit}
                disabled={sending}
              >
                {sending
                  ? 'Submitting...'
                  : sent
                    ? 'Send again'
                    : 'Send receipt'}
  
                <Send size={16} />
              </button>
            </div>
          </section>
  
          <aside className="panel payment-history">
  
            <SectionHeading
              eyebrow="YOUR RECORDS"
              title="Payment history"
            />
  
            <div className="history-list">
  
              {payments.map(p => (
                <button
                  className={`history-row ${
                    selectedPayment ===
                    p.id
                      ? 'selected'
                      : ''
                  }`}
                  key={p.id}
                  onClick={() =>
                    changePayment(
                      p.id
                    )
                  }
                >
                  <span className="history-icon">
                    <CreditCard
                      size={18}
                    />
                  </span>
  
                  <span>
                    <strong>
                      {p.title}
                    </strong>
  
                    <small>
                      Due{' '}
                      {formatDate(
                        p.dueDate
                      )}{' '}
                      ·{' '}
                      {money(
                        p.amount
                      )}
                    </small>
  
                    {p.transactionId && (
                      <small>
                        Txn:{' '}
                        {
                          p.transactionId
                        }
                      </small>
                    )}
                  </span>
  
                  {badge(p.status)}
                </button>
              ))}
            </div>
  
            <div className="history-help">
              <ShieldCheck
                size={19}
              />
  
              <p>
                Keep your original
                receipt until the
                college confirms your
                payment.
              </p>
            </div>
          </aside>
        </div>
  
        {preview && (
          <Modal
            title="Email preview"
            onClose={() =>
              setPreview(false)
            }
          >
            <div className="email-preview">
  
              <div>
                <span>To</span>
  
                <strong>
                  Accounts Office
                </strong>
              </div>
  
              <div>
                <span>
                  Subject
                </span>
  
                <strong>
                  Payment receipt —
                  {selected.title}
                </strong>
              </div>
  
              <div>
                <span>
                  Details
                </span>
  
                <strong>
                  {money(
                    Number(amount) ||
                      0
                  )}
                  {' · '}
                  {paidOn
                    ? fullDate(
                        paidOn
                      )
                    : 'Date missing'}
                  {' · '}
                  {transactionId ||
                    'Transaction ID missing'}
                </strong>
              </div>
  
              <div>
                <span>
                  Attachment
                </span>
  
                <strong>
                  {file?.name ||
                    'No receipt attached'}
                </strong>
              </div>
  
              <pre>
                {body}
              </pre>
            </div>
  
            <div className="modal-actions">
  
              <button
                className="secondary-button"
                onClick={() =>
                  setPreview(false)
                }
              >
                Edit details
              </button>
  
              <button
                className="primary-button"
                onClick={submit}
              >
                Send receipt
                <Send size={16} />
              </button>
            </div>
          </Modal>
        )}
      </>
    )
  }