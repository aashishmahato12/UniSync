import { supabase } from './supabase'

import {
  payments,
  documents,
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
    }))
  },


  // Keep these mocked for now because you don't
  // have Supabase tables for them yet.
  async getPayments(): Promise<Payment[]> {
    await delay()
    return structuredClone(payments)
  },

  async getDocuments(): Promise<DocumentItem[]> {
    await delay()
    return structuredClone(documents)
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