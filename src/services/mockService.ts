import { supabase } from './supabase'
import { answerFromSavedRecords } from './localAssistant'
import { cleanEmailForReading } from './emailText'
import { loadPaymentStatuses, paymentScheduleForAccount } from './paymentStatusStore'

import {
  payments,
  normalizeEventCategory,
  type CustomEventInput,
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

const displayFileSize = (bytes: number | null) => bytes == null ? '—' : bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`

const displayFileType = (mimeType: string) => mimeType === 'application/pdf' ? 'PDF' : 'Image'

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

    const connectedIds = [...new Set((data ?? []).map(row => row.gmail_message_id as string)
      .filter(id => id?.includes(':')))]
    const { data: linkedNotices } = connectedIds.length
      ? await supabase.from('college_notices').select('gmail_message_id,source_url')
        .in('gmail_message_id', connectedIds.slice(0, 100))
      : { data: [] as { gmail_message_id: string; source_url: string | null }[] }
    const noticeLinks = new Map((linkedNotices ?? []).map(row => [row.gmail_message_id, row.source_url]))

    const collegeEvents: EventItem[] = (data ?? []).map(row => ({
      id: row.id,

      title: row.title,

      // Supabase event_date -> frontend date
      date: row.event_date,

      time: row.start_time
        ? row.start_time.slice(0, 5)
        : undefined,

      location: row.location ?? undefined,

      category: normalizeEventCategory(row.title ?? '', row.category ?? ''),

      description: cleanEmailForReading(row.description ?? ''),

      source: 'College Email',
      gmailMessageId: row.gmail_message_id ?? undefined,
      sourceUrl: noticeLinks.get(row.gmail_message_id) || (/^[a-zA-Z0-9_-]{8,100}$/.test(row.gmail_message_id ?? '')
        ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}`
        : undefined),

      // Supabase snake_case -> React camelCase
      calendarState: row.calendar_state,
      googleCalendarEventId: row.google_calendar_event_id ?? undefined,
    }))

    const { data: customRows, error: customError } = await supabase
      .from('user_calendar_events')
      .select('id,title,event_date,start_time,location,category,description,created_at')
      .order('event_date', { ascending: true })

    // Keep the college calendar usable until the optional custom-event
    // migration has been installed.
    if (customError && !['42P01', 'PGRST205'].includes(customError?.code ?? '')) throw customError
    const customEvents: EventItem[] = (customRows ?? []).map(row => ({
      id: row.id,
      title: row.title,
      date: row.event_date,
      time: row.start_time ? row.start_time.slice(0, 5) : undefined,
      location: row.location ?? undefined,
      category: row.category,
      description: row.description ?? '',
      source: 'Added by you',
      isCustom: true,
      calendarState: 'Added',
    }))

    return [...collegeEvents, ...customEvents]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  },

  async createCalendarEvent(input: CustomEventInput): Promise<EventItem> {
    const title = input.title.trim()
    const location = input.location?.trim() || null
    const description = input.description?.trim() || ''
    if (!title || title.length > 160) throw new Error('Add an event title under 160 characters.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))) throw new Error('Choose a valid date.')
    if (input.time && !/^\d{2}:\d{2}$/.test(input.time)) throw new Error('Choose a valid time.')
    if (!['Exam', 'Deadline', 'College event', 'Holiday'].includes(input.category)) throw new Error('Choose an event type.')

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Sign in again before adding an event.')
    const { data: row, error } = await supabase
      .from('user_calendar_events')
      .insert({
        owner_id: authData.user.id,
        title,
        event_date: input.date,
        start_time: input.time || null,
        location,
        category: input.category,
        description,
      })
      .select('id,title,event_date,start_time,location,category,description')
      .single()
    if (error || !row) {
      if (['42P01', 'PGRST205'].includes(error?.code ?? '')) throw new Error('Custom events need the user calendar database setup first.')
      throw error ?? new Error('Could not add this event.')
    }
    return {
      id: row.id,
      title: row.title,
      date: row.event_date,
      time: row.start_time ? row.start_time.slice(0, 5) : undefined,
      location: row.location ?? undefined,
      category: row.category,
      description: row.description ?? '',
      source: 'Added by you',
      isCustom: true,
      calendarState: 'Added',
    }
  },


  // The fee schedule is still a local student-maintained record.
  async getPayments(): Promise<Payment[]> {
    await delay()
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email ?? ''
    return email ? loadPaymentStatuses(paymentScheduleForAccount(payments, email), email) : []
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
    const collegeDocuments = (data ?? []).map(row => {
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
        size: displayFileSize(row.size_bytes),
        type: displayFileType(row.mime_type),
        mimeType: row.mime_type,
        storagePath: row.storage_path,
        storageBucket: 'college-attachments' as const,
        gmailMessageId: row.gmail_message_id,
        emailSubject: row.subject || '(No subject)',
        sender: row.sender || 'Herald College',
        noticeSummary: notice?.summary,
        extractedText: extractedById.get(row.id)?.extracted_text ?? undefined,
        extractionStatus: extractedById.get(row.id)?.extraction_status as DocumentItem['extractionStatus'],
        sourceUrl: notice?.sourceUrl || (/^[a-zA-Z0-9_-]{8,100}$/.test(row.gmail_message_id)
          ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}` : ''),
      }
    })

    const { data: uploads, error: uploadError } = await supabase
      .from('user_documents')
      .select('id,file_name,mime_type,size_bytes,storage_path,category,created_at')
      .order('created_at', { ascending: false })

    // The college library remains usable before the optional user-upload
    // migration is installed.
    if (uploadError && !['42P01', 'PGRST205'].includes(uploadError.code ?? '')) throw uploadError
    const userDocuments: DocumentItem[] = (uploads ?? []).map(row => ({
      id: row.id,
      name: row.file_name,
      category: row.category,
      date: row.created_at.split('T')[0],
      size: displayFileSize(row.size_bytes),
      type: displayFileType(row.mime_type),
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      storageBucket: 'user-documents',
      gmailMessageId: '',
      emailSubject: 'Personal upload',
      sender: 'You',
      extractionStatus: 'Pending',
      sourceUrl: '',
    }))

    return [...userDocuments, ...collegeDocuments]
  },

  async uploadDocument(file: File, category: string): Promise<DocumentItem> {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) throw new Error('Choose a PDF, JPG, or PNG file.')
    if (file.size > 10 * 1024 * 1024) throw new Error('The file must be 10 MB or smaller.')
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Sign in again before uploading a document.')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-140)
    const storagePath = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (storageError) throw storageError

    const { data: row, error: rowError } = await supabase
      .from('user_documents')
      .insert({
        user_id: authData.user.id,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        category,
      })
      .select('id,file_name,mime_type,size_bytes,storage_path,category,created_at')
      .single()
    if (rowError || !row) {
      await supabase.storage.from('user-documents').remove([storagePath])
      throw rowError ?? new Error('Could not save this document.')
    }
    return {
      id: row.id,
      name: row.file_name,
      category: row.category,
      date: row.created_at.split('T')[0],
      size: displayFileSize(row.size_bytes),
      type: displayFileType(row.mime_type),
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      storageBucket: 'user-documents',
      gmailMessageId: '',
      emailSubject: 'Personal upload',
      sender: 'You',
      extractionStatus: 'Pending',
      sourceUrl: '',
    }
  },

  async openDocument(document: DocumentItem): Promise<string> {
    const { data, error } = await supabase.storage
      .from(document.storageBucket ?? 'college-attachments')
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
