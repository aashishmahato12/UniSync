import { supabase } from './supabase'
import { answerFromSavedRecords } from './localAssistant'
import { cleanEmailForReading } from './emailText'

import {
  payments,
  type EventItem,
  type Notice,
  type Payment,
  type DocumentItem,
} from '../data'

export type ReceiptSubmission = {
  paymentId: string
  amount: number
  paidOn: string
  transactionId: string
  paymentType: string
  body: string
  fileName: string
}

const delay = (ms = 250) =>
  new Promise(resolve => setTimeout(resolve, ms))

const documentCategory = (subject: string, fileName: string) => {
  const context = `${subject} ${fileName}`.toLowerCase()
  if (/fee|payment|invoice|receipt|tuition|scholarship|bank/.test(context)) return 'Finance'
  if (/exam|routine|class|course|assignment|semester|timetable|result|admission|registration|academic|transcript|syllabus|cybersecurity|computer science|business management/.test(context)) return 'Academic'
  if (/event|club|festival|volunteer|campus|workshop|seminar|orientation|holiday/.test(context)) return 'Campus'
  return 'General'
}

export const studentService = {

  async getNotices(): Promise<Notice[]> {

    const { data, error } = await supabase
      .from('college_notices')
      .select('*')
      .order('received_at', { ascending: false })

    if (error) {
      console.error('Supabase notices error:', error)
      throw error
    }

    return (data ?? []).map(row => ({
      id: row.id,

      // Supabase "subject" -> frontend "title"
      title: row.subject,

      date:
        row.received_at?.split('T')[0] ??
        row.created_at?.split('T')[0],
      receivedAt: row.received_at ?? undefined,

      category: row.category,

      priority: row.priority as 'High' | 'Normal',

      summary: row.summary,
      bodyText: row.body_text ?? undefined,

      // Take first attachment if one exists
      attachment:
        Array.isArray(row.attachment_names)
          ? row.attachment_names[0]
          : undefined,
      attachmentNames: Array.isArray(row.attachment_names) ? row.attachment_names : [],
      gmailMessageId: row.gmail_message_id,
      sourceUrl: row.source_url ?? undefined,

      source:
        row.sender
          ? `${row.sender} · Email`
          : 'College Email',
    }))
  },


  async getEvents(): Promise<EventItem[]> {

    const { data, error } = await supabase
      .from('college_events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Supabase events error:', error)
      throw error
    }

    return (data ?? []).map(row => ({
      id: row.id,

      title: row.title,

      // Supabase event_date -> frontend date
      date: row.event_date,

      time: row.start_time
        ? row.start_time.slice(0, 5)
        : undefined,

      location: row.location ?? undefined,

      category: row.category,

      description: cleanEmailForReading(row.description ?? ''),

      source: 'College Email',
      sourceUrl: /^[a-zA-Z0-9_-]{8,100}$/.test(row.gmail_message_id ?? '')
        ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}`
        : undefined,

      // Supabase snake_case -> React camelCase
      calendarState: row.calendar_state,
      googleCalendarEventId: row.google_calendar_event_id ?? undefined,
    }))
  },


  // The fee schedule is still a local student-maintained record.
  async getPayments(): Promise<Payment[]> {
    await delay()
    return structuredClone(payments)
  },

  async getDocuments(notices: Notice[] = []): Promise<DocumentItem[]> {
    const { data, error } = await supabase
      .from('college_attachments')
      .select('id,gmail_message_id,file_name,mime_type,size_bytes,storage_path,received_at,created_at,subject,sender')
      .order('received_at', { ascending: false })
    if (error) throw error
    const { data: extracted } = await supabase
      .from('college_attachments')
      .select('id,extracted_text,extraction_status')
    const extractedById = new Map((extracted ?? []).map(row => [row.id, row]))
    const byMessageId = new Map(notices.map(notice => [notice.gmailMessageId, notice]))
    return (data ?? []).map(row => {
      const notice = byMessageId.get(row.gmail_message_id)
      const category = notice?.category === 'Payments' ? 'Finance'
        : notice?.category === 'Exams' || notice?.category === 'Academics' ? 'Academic'
        : notice?.category === 'Campus life' ? 'Campus'
        : documentCategory(row.subject ?? '', row.file_name)
      return {
        id: row.id,
        name: row.file_name,
        category,
        date: (row.received_at ?? row.created_at).split('T')[0],
        size: row.size_bytes == null ? '—' : row.size_bytes >= 1024 * 1024
          ? `${(row.size_bytes / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(row.size_bytes / 1024))} KB`,
        type: row.mime_type === 'application/pdf' ? 'PDF' : 'Image',
        mimeType: row.mime_type,
        storagePath: row.storage_path,
        gmailMessageId: row.gmail_message_id,
        emailSubject: row.subject || '(No subject)',
        sender: row.sender || 'Herald College',
        noticeSummary: notice?.summary,
        extractedText: extractedById.get(row.id)?.extracted_text ?? undefined,
        extractionStatus: extractedById.get(row.id)?.extraction_status as DocumentItem['extractionStatus'],
        sourceUrl: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}`,
      }
    })
  },

  async openDocument(document: DocumentItem): Promise<string> {
    const { data, error } = await supabase.storage
      .from('college-attachments')
      .createSignedUrl(document.storagePath, 60)
    if (error || !data?.signedUrl) throw error ?? new Error('Could not open this file.')
    return data.signedUrl
  },


  async updateCalendarState(
    eventId: string,
    state: EventItem['calendarState']
  ) {

    const { error } = await supabase
      .from('college_events')
      .update({
        calendar_state: state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (error) throw error

    return { ok: true }
  },


  async submitReceipt(_submission: ReceiptSubmission) {
    await delay(550)

    return {
      ok: true,
      mode: 'mock' as const,
    }
  },


  async askAI(question: string, currentPayments: Payment[]) {
    // Student-marked payment statuses stay in the browser. Extracted college
    // attachment text may be used by the private Gemini workflow.
    if (!/\b(fee|payment|paid|receipt|tuition|admission)\b/i.test(question)) {
      const { data: session } = await supabase.auth.getSession()
      if (session.session?.access_token) {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
          body: JSON.stringify({ question }),
        })
        if (response.ok) return await response.json() as {
          answer: string
          sources: import('./localAssistant').AssistantSource[]
          actions: { type: 'add_to_calendar'; eventId: string }[]
          mode: 'ai'
        }
        if (response.status !== 404) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || `AI service error (${response.status}). Please try again after deployment.`)
        }
      }
    }
    const [savedNotices, savedEvents, savedDocuments] = await Promise.all([
      this.getNotices(), this.getEvents(), this.getDocuments(),
    ])
    return { ...answerFromSavedRecords(question, savedNotices, savedEvents, savedDocuments, currentPayments), actions: [], mode: 'search' as const }
  },
}
