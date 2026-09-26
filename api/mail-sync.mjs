import { timingSafeEqual } from 'node:crypto'
import { accessTokenForConnection, adminClient, config, extractNotice, gmailRequest,
  json, parseGmailMessage, rfc822Message, rfc822ReceiptMessage } from '../mail-core.mjs'
import { claimGeminiRateSlot } from '../gemini-rate-limit.mjs'

export const maxDuration = 60

function authorized(request) {
  const expected = process.env.UNISYNC_N8N_MAIL_SYNC_SECRET || ''
  const actual = request.headers.get('x-unisync-mail-sync-secret') || ''
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b)
}

export function messageKey(connection, id) {
  // Only the legacy owner's rows use raw Gmail IDs. A different UniSync
  // account may connect that mailbox for testing, but its rows stay separate.
  return connection.mailbox_email === 'mahatoaashish5@gmail.com' &&
    connection.owner_id === connection.original_owner_id
    ? id : `${connection.owner_id}:${id}`
}

export function canSendCollegeEmail(connection) {
  return connection.mailbox_email !== 'mahatoaashish5@gmail.com' ||
    connection.owner_id === connection.original_owner_id
}

async function importMail(connection, accessToken, admin) {
  // Gmail lists newest first. Walk past already-imported pages so accounts can
  // gradually load their older college mail without a separate backfill flow.
  const pending = []
  let pageToken
  do {
    const query = new URLSearchParams({ q: 'from:(@heraldcollege.edu.np)', maxResults: '100' })
    if (pageToken) query.set('pageToken', pageToken)
    const list = await gmailRequest(`messages?${query}`, accessToken)
    const ids = (list.messages || []).map(item => String(item.id || '')).filter(Boolean)
    if (!ids.length) break
    const keys = ids.map(id => messageKey(connection, id))
    const { data: existing, error: readError } = await admin.from('college_notices')
      .select('gmail_message_id').in('gmail_message_id', keys)
    if (readError) throw readError
    const saved = new Set((existing || []).map(row => row.gmail_message_id))
    pending.push(...ids.filter(id => !saved.has(messageKey(connection, id))).slice(0, 2 - pending.length))
    pageToken = list.nextPageToken
  } while (pending.length < 2 && pageToken)
  let imported = 0
  for (const remoteId of pending) {
    const full = await gmailRequest(`messages/${encodeURIComponent(remoteId)}?format=full`, accessToken)
    const message = parseGmailMessage(full)
    if (!message || !message.id) continue
    // A skipped message remains unsaved and will be picked up on a later run.
    if (!await claimGeminiRateSlot(admin)) break
    const extracted = await extractNotice(message)
    const gmailMessageId = messageKey(connection, message.id)
    for (const [index, attachment] of message.attachments.entries()) {
      if (index >= 50 || !['application/pdf', 'image/jpeg', 'image/png'].includes(attachment.mimeType)
        || attachment.size <= 0 || attachment.size > 10 * 1024 * 1024
        || (!attachment.data && !attachment.attachmentId)) continue
      const path = `${connection.owner_id}/${message.id}/${index}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const payload = attachment.data
        ? { data: attachment.data }
        : await gmailRequest(`messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(attachment.attachmentId)}`, accessToken)
      if (!payload.data) throw new Error('Gmail attachment data is missing')
      const bytes = Buffer.from(payload.data, 'base64url')
      if (bytes.length > 10 * 1024 * 1024) continue
      const { error: uploadError } = await admin.storage.from('college-attachments')
        .upload(path, bytes, { contentType: attachment.mimeType, upsert: true })
      if (uploadError) throw uploadError
      const { error: attachmentError } = await admin.from('college_attachments').upsert({
        owner_id: connection.owner_id, gmail_message_id: gmailMessageId,
        attachment_index: index, file_name: attachment.name, mime_type: attachment.mimeType,
        size_bytes: bytes.length, storage_path: path, sender: message.sender,
        subject: message.subject, received_at: message.receivedAt,
      }, { onConflict: 'gmail_message_id,attachment_index' })
      if (attachmentError) throw attachmentError
    }
    const { error: noticeError } = await admin.from('college_notices').upsert({
      owner_id: connection.owner_id, gmail_message_id: gmailMessageId,
      gmail_thread_id: message.threadId || null, subject: message.subject,
      sender: message.sender, received_at: message.receivedAt,
      summary: extracted.summary, body_text: message.body || null,
      category: extracted.category, priority: extracted.priority,
      attachment_names: message.attachmentNames,
      source_url: `https://mail.google.com/mail/u/${encodeURIComponent(connection.mailbox_email)}/#all/${encodeURIComponent(message.id)}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'gmail_message_id' })
    if (noticeError) throw noticeError
    if (extracted.events.length) {
      const rows = extracted.events.map((event, index) => ({
        ...event, owner_id: connection.owner_id,
        gmail_message_id: gmailMessageId, event_key: `${gmailMessageId}:${index}`,
        calendar_state: 'Pending',
      }))
      const { error: eventError } = await admin.from('college_events').upsert(rows, {
        onConflict: 'event_key', ignoreDuplicates: true,
      })
      if (eventError) throw eventError
    }
    imported++
  }
  return imported
}

async function sendOne(connection, accessToken, admin) {
  // A test account may import the original mailbox, but only its actual owner
  // may send college email from that shared Gmail address.
  if (!canSendCollegeEmail(connection)) return 0
  const { data, error } = await admin.rpc('claim_next_connected_college_email', {
    p_owner: connection.owner_id,
  })
  if (error) throw error
  const job = data?.[0]
  if (!job) return 0
  try {
    const sent = await gmailRequest('messages/send', accessToken, {
      method: 'POST', body: JSON.stringify({ raw: rfc822Message(job, connection.mailbox_email) }),
    })
    if (!sent.id) throw new Error('Gmail did not confirm delivery')
    const { error: saveError } = await admin.from('college_email_jobs').update({
      status: 'sent', gmail_message_id: sent.id, sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing')
    if (saveError) throw saveError
    return 1
  } catch (caught) {
    // Do not auto-retry: Gmail might have accepted a message before the error.
    const { error: saveError } = await admin.from('college_email_jobs').update({
      status: 'failed', error_message: 'Delivery was not confirmed. Check Gmail Sent before retrying.',
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing')
    if (saveError) console.error('Could not save failed mail delivery', saveError.code)
    throw caught
  }
}

async function sendReceiptOne(connection, accessToken, admin) {
  const { data: pending, error: readError } = await admin.from('payment_receipt_jobs')
    .select('*').eq('owner_id', connection.owner_id).eq('status', 'queued')
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (readError && ['42P01', 'PGRST205'].includes(readError.code)) return 0
  if (readError) throw readError
  if (!pending) return 0
  const { data: job, error: claimError } = await admin.from('payment_receipt_jobs')
    .update({ status: 'processing', processing_at: new Date().toISOString(),
      updated_at: new Date().toISOString() })
    .eq('id', pending.id).eq('owner_id', connection.owner_id).eq('status', 'queued')
    .select('*').maybeSingle()
  if (claimError) throw claimError
  if (!job) return 0
  try {
    if (!job.receipt_path.startsWith(`${connection.owner_id}/`)) throw new Error('Invalid receipt path')
    const { data: file, error: downloadError } = await admin.storage.from('payment-receipts')
      .download(job.receipt_path)
    if (downloadError || !file) throw new Error('Could not download receipt')
    const bytes = Buffer.from(await file.arrayBuffer())
    const raw = rfc822ReceiptMessage(job, connection.mailbox_email,
      'aashishmahato8000@gmail.com', bytes)
    const sent = await gmailRequest('messages/send', accessToken, {
      method: 'POST', body: JSON.stringify({ raw }),
    })
    if (!sent.id) throw new Error('Gmail did not confirm receipt delivery')
    const { error: saveError } = await admin.from('payment_receipt_jobs').update({
      status: 'sent', gmail_message_id: sent.id, sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing')
    if (saveError) throw saveError
    return 1
  } catch (caught) {
    console.error('Test receipt delivery failed', caught instanceof Error ? caught.message : 'unknown')
    // A failed response does not prove Gmail rejected the message: never retry automatically.
    const { error: saveError } = await admin.from('payment_receipt_jobs').update({
      status: 'failed', error_message: 'Delivery was not confirmed. Check Gmail Sent before retrying.',
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('status', 'processing')
    if (saveError) throw saveError
    return 0
  }
}

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!authorized(request)) return json({ error: 'Unauthorized.' }, 401)
  const settings = config()
  if (!settings) return json({ error: 'Gmail connection is not configured.' }, 503)
  const admin = adminClient(settings)
  const { data: connections, error } = await admin.from('mail_connections')
    .select('owner_id,mailbox_email,refresh_token_encrypted,last_synced_at')
    .eq('status', 'connected')
    .order('last_synced_at', { ascending: true, nullsFirst: true }).limit(1)
  if (error) return json({ error: 'Could not select a mailbox.' }, 502)
  const connection = connections?.[0]
  if (!connection) return json({ status: 'idle' })
  try {
    const { data: originalOwnerId, error: ownerError } = await admin.rpc('original_mailbox_owner_id')
    if (ownerError || !originalOwnerId) throw new Error('Could not identify original mailbox owner')
    connection.original_owner_id = originalOwnerId
    const accessToken = await accessTokenForConnection(connection, settings, admin)
    const sent = await sendOne(connection, accessToken, admin)
    const receiptsSent = await sendReceiptOne(connection, accessToken, admin)
    const imported = await importMail(connection, accessToken, admin)
    const { error: updateError } = await admin.from('mail_connections').update({
      last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('owner_id', connection.owner_id)
    if (updateError) throw updateError
    return json({ status: 'processed', imported, sent, receiptsSent })
  } catch (caught) {
    console.error('Mailbox sync failed', caught instanceof Error ? caught.message : 'unknown')
    await admin.from('mail_connections').update({ last_synced_at: new Date().toISOString() })
      .eq('owner_id', connection.owner_id)
    return json({ error: 'Mailbox sync failed. Check the server and n8n execution logs.' }, 502)
  }
} }
