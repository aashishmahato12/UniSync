import type { DocumentItem, EventItem, Notice, Payment } from '../data'

export type AssistantSource = {
  id: string
  kind: 'Notice' | 'Event' | 'Document' | 'Payment'
  title: string
  url?: string
}

export type AssistantAnswer = { answer: string; sources: AssistantSource[] }

const stopWords = new Set('about all and are can college do does for from have how into is me my of on please show tell that the there these this to what when where which with you your'.split(' '))
const words = (text: string) => [...new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])]
  .filter(word => !stopWords.has(word))

const dateLabel = (date: string) => date
  ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : 'date unknown'

export function answerFromSavedRecords(
  question: string,
  notices: Notice[],
  events: EventItem[],
  documents: DocumentItem[],
  payments: Payment[],
): AssistantAnswer {
  const lower = question.toLowerCase()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const wantsDocuments = /document|attachment|file|pdf|image|scan/i.test(lower)
  const wantsEvents = /upcoming|event|exam|deadline|calendar|schedule|when|this week/i.test(lower)
  const wantsNotices = /notice|announcement|email|update|important|recent/i.test(lower)
  const wantsPayments = /fee|payment|paid|due|receipt|tuition|admission/i.test(lower)
  const asksFileContents = /\b(file|pdf|document|image)\b/i.test(lower) &&
    /\b(inside|say|contain|summari[sz]e|read|about)\b/i.test(lower)
  const terms = words(question)

  const candidates = [
    ...notices.map(notice => ({
      source: { id: notice.id, kind: 'Notice' as const, title: notice.title, url: notice.sourceUrl },
      search: `${notice.title} ${notice.summary} ${notice.category}`.toLowerCase(),
      line: `${notice.title} (${dateLabel(notice.date)}): ${notice.summary}`,
      date: notice.date,
      boost: wantsNotices ? 3 : notice.priority === 'High' ? 1 : 0,
    })),
    ...events.map(event => ({
      source: { id: event.id, kind: 'Event' as const, title: event.title, url: event.sourceUrl },
      search: `${event.title} ${event.description} ${event.category} ${event.location ?? ''}`.toLowerCase(),
      line: `${event.title} — ${dateLabel(event.date)}${event.time ? ` at ${event.time}` : ''}${event.location ? `, ${event.location}` : ''}. ${event.description}`,
      date: event.date,
      boost: wantsEvents && event.date >= today ? 5 : wantsEvents ? 2 : 0,
    })),
    ...documents.map(file => ({
      source: { id: file.id, kind: 'Document' as const, title: file.name, url: file.sourceUrl },
      search: `${file.name} ${file.emailSubject} ${file.sender} ${file.category}`.toLowerCase(),
      line: `${file.name} — attached to “${file.emailSubject}” from ${file.sender} (${dateLabel(file.date)}).`,
      date: file.date,
      boost: wantsDocuments ? 4 : 0,
    })),
    ...payments.map(payment => ({
      source: { id: payment.id, kind: 'Payment' as const, title: payment.title },
      search: `${payment.title} ${payment.details} ${payment.status} fee payment semester`.toLowerCase(),
      line: `${payment.title} — NPR ${payment.amount.toLocaleString('en-US')}; ${payment.dueDate ? `tentative date ${dateLabel(payment.dueDate)}` : payment.dateLabel}; marked ${payment.status} by you. ${payment.details}`,
      date: payment.dueDate,
      boost: wantsPayments ? 5 : 0,
    })),
  ]
  if (!candidates.length) return {
    answer: 'No Herald College records are saved yet. Notices, events and documents will appear here after the Gmail workflows run.',
    sources: [],
  }

  const ranked = candidates.map(candidate => ({
    ...candidate,
    score: candidate.boost + terms.reduce((sum, term) => sum + (candidate.search.includes(term) ? 3 : 0), 0),
  })).sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
  const preferred = wantsDocuments ? ranked.filter(item => item.source.kind === 'Document') : ranked
  const matches = preferred.filter(item => item.score > 0).slice(0, wantsDocuments ? 4 : 5)
  if (!matches.length) return {
    answer: 'I could not find that in your saved Herald College records. Try a subject, date, fee, exam, or document name.',
    sources: [],
  }

  const lines = matches.map(item => `• ${item.line}`)
  const prefix = asksFileContents && matches.some(item => item.source.kind === 'Document')
    ? 'I found these files and their source emails. I cannot read the contents of PDFs or images yet.\n\n'
    : ''
  return {
    answer: `${prefix}${lines.join('\n')}`,
    sources: matches.map(item => item.source),
  }
}
