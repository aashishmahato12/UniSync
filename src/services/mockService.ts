import { events, notices, payments, documents, type EventItem, type Notice, type Payment, type DocumentItem } from '../data'

export type ReceiptSubmission = { paymentId: string; amount: number; paidOn: string; transactionId: string; paymentType: string; body: string; fileName: string }
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms))

// Replace these functions with Supabase queries or n8n webhooks when credentials are available.
export const studentService = {
  async getEvents(): Promise<EventItem[]> { await delay(); return structuredClone(events) },
  async getNotices(): Promise<Notice[]> { await delay(); return structuredClone(notices) },
  async getPayments(): Promise<Payment[]> { await delay(); return structuredClone(payments) },
  async getDocuments(): Promise<DocumentItem[]> { await delay(); return structuredClone(documents) },
  async updateCalendarState(_eventId: string, _state: EventItem['calendarState']) { await delay(); return { ok: true } },
  async submitReceipt(_submission: ReceiptSubmission) { await delay(550); return { ok: true, mode: 'mock' as const } },
  async askAI(question: string) { await delay(500); const q = question.toLowerCase(); if (q.includes('fee') || q.includes('pay')) return 'Your semester tuition of NPR 28,500 is due on the 18th. You can upload your mobile banking receipt in Payments, preview the email, then send it to the accounts office when email integration is connected.'; if (q.includes('exam') || q.includes('practical')) return 'Your Physics practical is on the 17th at 9:00 AM in Science Lab 2. Bring your lab record and college ID, and arrive by 8:30 AM.'; if (q.includes('event') || q.includes('showcase')) return 'The student innovation showcase is on the 25th at 11:00 AM in the Main Auditorium. It is pending in Events, where you can add it to your calendar.'; return 'I can help you find information in your Herald College notices, events, payments, and documents. Try asking about the fee deadline, practical exam, or upcoming showcase.' },
}
