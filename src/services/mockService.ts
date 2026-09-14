import { supabase } from './supabase'

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

      category: row.category,

      priority: row.priority as 'High' | 'Normal',

      summary: row.summary,

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

      description: row.description ?? '',

      source: 'College Email',

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
      .select('id,gmail_message_id,file_name,mime_type,size_bytes,storage_path,received_at,created_at')
      .order('received_at', { ascending: false })
    if (error) throw error
    const byMessageId = new Map(notices.map(notice => [notice.gmailMessageId, notice]))
    return (data ?? []).map(row => {
      const notice = byMessageId.get(row.gmail_message_id)
      const category = notice?.category === 'Payments' ? 'Finance'
        : notice?.category === 'Exams' || notice?.category === 'Academics' ? 'Academic'
        : notice?.category === 'Campus life' ? 'Campus' : 'General'
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
        noticeTitle: notice?.title ?? row.file_name,
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


  async askAI(question: string) {
    await delay(500)

    return `AI integration is not connected yet. You asked: "${question}"`
  },
}