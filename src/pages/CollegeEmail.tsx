import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Mail, RefreshCw, Send, XCircle } from 'lucide-react'
import { getCollegeEmailJobs, queueCollegeEmail, type CollegeEmailJob } from '../services/collegeEmail'
import './CollegeEmail.css'

const statusLabel = (job: CollegeEmailJob) => job.status === 'sent' ? 'Sent' : job.status === 'failed' ? 'Failed' : job.status === 'processing' ? 'Sending' : 'Queued'

export default function CollegeEmail({ senderEmail, notify }: { senderEmail: string; notify: (message: string) => void }) {
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [jobs, setJobs] = useState<CollegeEmailJob[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = async () => {
    try { setJobs(await getCollegeEmailJobs()) } catch { /* Migration may not be installed yet. */ }
  }
  useEffect(() => { void refresh() }, [])
  const send = async () => {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setError('Add a subject and a message before sending.')
      return
    }
    setBusy(true); setError('')
    try {
      const job = await queueCollegeEmail(recipient, subject, message)
      setJobs(current => [job, ...current])
      setSubject(''); setMessage('')
      notify('Email queued for secure delivery through Gmail.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not queue this email.')
    } finally { setBusy(false) }
  }
  return <div className="college-email-page">
    <div className="page-intro"><div><h1>Email college</h1><p>Write to a verified Herald College address from your student space.</p></div></div>
    <div className="college-email-layout">
      <section className="college-email-compose">
        <div className="college-email-paper-head"><span><Mail size={20} /></span><div><small>NEW MESSAGE</small><strong>Compose email</strong></div></div>
        <div className="college-email-line"><label>From</label><span>{senderEmail}</span></div>
        <div className="college-email-line"><label htmlFor="college-email-to">To</label><input id="college-email-to" type="email" value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="name@heraldcollege.edu.np" /></div>
        <div className="college-email-line"><label htmlFor="college-email-subject">Subject</label><input id="college-email-subject" value={subject} maxLength={180} onChange={event => setSubject(event.target.value)} placeholder="What is this about?" /></div>
        <textarea aria-label="Email message" value={message} maxLength={10000} onChange={event => setMessage(event.target.value)} placeholder="Write your message…" />
        <div className="college-email-compose-foot"><span>{message.length.toLocaleString()} / 10,000</span><button type="button" onClick={() => void send()} disabled={busy}>{busy ? 'Queuing…' : <>Send email <Send size={15} /></>}</button></div>
        {error && <p className="college-email-error" role="alert">{error}</p>}
      </section>
      <aside className="college-email-side">
        <div className="college-email-side-head"><div><small>DELIVERY</small><h2>Recent emails</h2></div><button type="button" onClick={() => void refresh()} aria-label="Refresh email status"><RefreshCw size={15} /></button></div>
        <p>Emails are queued privately, then sent by your connected n8n Gmail workflow.</p>
        <div className="college-email-history">{jobs.length ? jobs.slice(0, 5).map(job => <article key={job.id}>
          <span className={`college-email-state ${job.status}`}>{job.status === 'sent' ? <CheckCircle2 size={17} /> : job.status === 'failed' ? <XCircle size={17} /> : <Clock3 size={17} />}</span>
          <div><strong>{job.subject}</strong><small>To {job.recipient}</small><time>{new Date(job.created_at).toLocaleString()}</time></div>
          <em className={job.status}>{statusLabel(job)}</em>
        </article>) : <div className="college-email-empty"><Mail size={22} /><span>No emails queued yet.</span></div>}</div>
        <div className="college-email-note"><strong>College addresses only</strong><span>For safety, UniSync only accepts recipients ending in @heraldcollege.edu.np.</span></div>
      </aside>
    </div>
  </div>
}
