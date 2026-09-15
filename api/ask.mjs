import { createClient } from '@supabase/supabase-js'

const ownerEmail = 'mahatoaashish5@gmail.com'
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const tokens = text => [...new Set((text.toLowerCase().match(/[a-z0-9]{3,}/g) || [])
  .filter(word => !'the and for from have with your about what when where which please show tell college herald does say'.split(' ').includes(word)))]
const score = (text, terms) => terms.reduce((total, term) => total + (text.toLowerCase().includes(term) ? 1 : 0), 0)

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const webhook = process.env.UNISYNC_N8N_AI_URL
  const secret = process.env.UNISYNC_N8N_AI_SECRET
  if (!url || !key || !webhook || !secret) return json({ error: 'AI chat is not configured yet.' }, 503)
  let webhookUrl
  try {
    webhookUrl = new URL(webhook)
    if (webhookUrl.protocol !== 'https:') throw new Error('HTTPS required')
  } catch { return json({ error: 'AI chat URL is invalid.' }, 503) }

  const auth = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '')
  if (!auth) return json({ error: 'Sign in first.' }, 401)
  let question
  try { question = String((await request.json()).question || '').trim() }
  catch { return json({ error: 'Invalid request.' }, 400) }
  if (!question || question.length > 600) return json({ error: 'Question must be 1–600 characters.' }, 400)

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${auth[1]}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: authError } = await client.auth.getUser(auth[1])
  if (authError || userData.user?.email?.toLowerCase() !== ownerEmail) return json({ error: 'Access denied.' }, 403)

  const [noticesResult, eventsResult, documentsResult] = await Promise.all([
    client.from('college_notices').select('id,subject,summary,category,priority,received_at,source_url').order('received_at', { ascending: false }).limit(120),
    client.from('college_events').select('id,title,description,category,event_date,start_time,location,calendar_state,gmail_message_id').order('event_date', { ascending: true }).limit(120),
    client.from('college_attachments').select('id,file_name,subject,sender,extracted_text,received_at,gmail_message_id').eq('extraction_status', 'Ready').order('received_at', { ascending: false }).limit(120),
  ])
  if (noticesResult.error || eventsResult.error) return json({ error: 'Could not read college records.' }, 502)
  const asksAboutFile = /\b(pdf|document|attachment|file|image|scan)\b/i.test(question)
  if (asksAboutFile && documentsResult.error) return json({ error: 'Could not load read documents. Check the attachment-text setup in Supabase.' }, 502)
  const terms = tokens(question)
  const notices = (noticesResult.data || []).map(row => ({
    id: row.id, kind: 'Notice', title: row.subject, date: row.received_at?.slice(0, 10) || '',
    detail: row.summary?.slice(0, 900) || '', category: row.category, priority: row.priority,
    url: row.source_url || undefined,
  }))
  const events = (eventsResult.data || []).map(row => ({
    id: row.id, kind: 'Event', title: row.title, date: row.event_date,
    detail: row.description?.slice(0, 900) || '', category: row.category,
    time: row.start_time?.slice(0, 5) || '', location: row.location || '',
    calendarState: row.calendar_state,
    url: /^[a-zA-Z0-9_-]{8,100}$/.test(row.gmail_message_id || '')
      ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}` : undefined,
  }))
  // The optional migration can be applied after this code is deployed.
  const documents = (documentsResult.error ? [] : documentsResult.data || []).map(row => ({
    id: row.id, kind: 'Document', title: row.file_name, date: row.received_at?.slice(0, 10) || '',
    detail: `${row.subject || ''}\n${String(row.extracted_text || '').slice(0, 2400)}`,
    category: 'Attachment', sender: row.sender,
    url: /^[a-zA-Z0-9_-]{8,100}$/.test(row.gmail_message_id || '')
      ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(row.gmail_message_id)}` : undefined,
  }))
  if (asksAboutFile && !documents.length) return json({
    answer: 'I can see that you asked about a file, but no PDF or image text is ready yet. Check the attachment reader and try again after a file shows as Ready.',
    sources: [], actions: [], mode: 'ai',
  })
  const fileTerms = terms.filter(term => !['pdf', 'document', 'attachment', 'file', 'image', 'scan', 'read', 'inside'].includes(term))
  const matchingDocuments = asksAboutFile ? documents.map(item => ({ item,
    rank: score(`${item.title} ${item.detail}`, fileTerms),
  })).filter(entry => entry.rank > 0).sort((a, b) => b.rank - a.rank || b.item.date.localeCompare(a.item.date)) : []
  if (asksAboutFile && fileTerms.length <= 2 && (matchingDocuments.length > 1 || (!fileTerms.length && documents.length > 1))) {
    const candidates = matchingDocuments.length ? matchingDocuments.map(entry => entry.item) : documents
    const choices = candidates.slice(0, 5)
    return json({
      answer: `I found ${candidates.length} read files that could match. Which one do you mean? Choose a source below, then use “Ask about this.”`,
      sources: choices.map(({ id, kind, title, url }) => ({ id, kind, title, url })),
      actions: [], mode: 'ai',
    })
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const ranked = [...notices, ...events, ...documents].map(item => ({ item,
    rank: score(`${item.title} ${item.detail} ${item.category}`, terms) +
      (item.kind === 'Event' && /event|exam|deadline|calendar|schedule|when|upcoming/i.test(question) ? 2 : 0) +
      (item.kind === 'Event' && item.date >= today ? 1 : 0) +
      (item.kind === 'Notice' && /notice|email|announcement|update/i.test(question) ? 2 : 0) +
      (item.kind === 'Document' && /document|attachment|file|pdf|image|scan|read|inside/i.test(question) ? 2 : 0),
  })).sort((a, b) => b.rank - a.rank || (a.item.kind === 'Event' && b.item.kind === 'Event' && a.item.date >= today && b.item.date >= today
    ? a.item.date.localeCompare(b.item.date) : b.item.date.localeCompare(a.item.date)))
  const context = asksAboutFile
    ? (matchingDocuments.length ? matchingDocuments.slice(0, 4).map(entry => entry.item) : documents.slice(0, 4))
    : ranked.filter(entry => entry.rank > 0).slice(0, 12).map(entry => entry.item)
  if (!context.length) return json({ answer: 'I could not find a matching saved college record.', sources: [], actions: [], mode: 'ai' })

  let upstream
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-UniSync-AI-Secret': secret },
      body: JSON.stringify({ question, today, records: context }),
      // Free Gemini calls can occasionally take longer when n8n is cold.
      signal: AbortSignal.timeout(55000),
    })
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    return json({ error: timedOut
      ? 'AI took too long to answer. Please try again.'
      : 'AI workflow is unavailable. Check the n8n webhook URL in Vercel.' }, 502)
  }
  if (!upstream.ok) return json({ error: 'AI workflow could not answer. Please try again.' }, 502)
  let result
  try { result = await upstream.json() } catch { return json({ error: 'AI workflow returned an invalid answer.' }, 502) }
  const raw = result.output || result
  const byId = new Map(context.map(item => [item.id, item]))
  const sources = [...new Set(Array.isArray(raw.citations) ? raw.citations : [])]
    .map(id => byId.get(String(id))).filter(Boolean).map(({ id, kind, title, url }) => ({ id, kind, title, url }))
  const actions = (Array.isArray(raw.actions) ? raw.actions : []).slice(0, 3)
    .filter(action => action?.type === 'add_to_calendar' && byId.get(String(action.eventId))?.kind === 'Event' && byId.get(String(action.eventId))?.calendarState === 'Pending')
    .map(action => ({ type: 'add_to_calendar', eventId: String(action.eventId) }))
  const answer = String(raw.answer || '').trim().slice(0, 3000)
  if (!answer) return json({ error: 'AI workflow returned an empty answer.' }, 502)
  return json({ answer, sources, actions, mode: 'ai' })
} }
