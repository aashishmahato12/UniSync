import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
})

export function config() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const googleClientId = process.env.UNISYNC_GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.UNISYNC_GOOGLE_CLIENT_SECRET
  const appOrigin = process.env.UNISYNC_APP_ORIGIN
  const tokenKey = process.env.UNISYNC_MAIL_TOKEN_KEY
  if (![supabaseUrl, serviceKey, googleClientId, googleClientSecret, appOrigin, tokenKey].every(Boolean)) return null
  let origin
  try {
    const url = new URL(appOrigin)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return null
    origin = url.origin
  } catch { return null }
  const key = Buffer.from(tokenKey, 'base64')
  if (key.length !== 32) return null
  return { supabaseUrl, serviceKey, googleClientId, googleClientSecret, origin, key }
}

export function adminClient(settings) {
  return createClient(settings.supabaseUrl, settings.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function callbackUrl(settings) { return `${settings.origin}/api/mail-callback` }
export function stateHash(value) { return createHash('sha256').update(value).digest('hex') }

export function encryptToken(token, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, encrypted, cipher.getAuthTag()].map(part => part.toString('base64url')).join('.')
}

export function decryptToken(value, key) {
  const [rawIv, rawEncrypted, rawTag] = String(value || '').split('.')
  if (!rawIv || !rawEncrypted || !rawTag) throw new Error('Invalid stored Gmail token')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(rawIv, 'base64url'))
  decipher.setAuthTag(Buffer.from(rawTag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(rawEncrypted, 'base64url')), decipher.final()]).toString('utf8')
}

export async function signedInUser(request, admin) {
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '')
  if (!match) return null
  const { data, error } = await admin.auth.getUser(match[1])
  if (error || !data.user?.email) return null
  const { data: account, error: accountError } = await admin.from('app_users')
    .select('email').eq('email', data.user.email.toLowerCase()).maybeSingle()
  return accountError || !account ? null : data.user
}

export async function googleTokenFromCode(code, settings) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: settings.googleClientId,
      client_secret: settings.googleClientSecret, redirect_uri: callbackUrl(settings),
      grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Google did not authorize this mailbox')
  return response.json()
}

export async function accessTokenForConnection(connection, settings, admin) {
  const refreshToken = decryptToken(connection.refresh_token_encrypted, settings.key)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: settings.googleClientId,
      client_secret: settings.googleClientSecret, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      const { error } = await admin.from('mail_connections').update({ status: 'reconnect_required',
        updated_at: new Date().toISOString() }).eq('owner_id', connection.owner_id)
      if (error) console.error('Could not mark Gmail connection for reconnection', error.code)
      throw new Error('Mailbox access expired; reconnect Gmail in Profile')
    }
    throw new Error(`Google token refresh failed (${response.status})`)
  }
  const token = await response.json()
  if (!token.access_token) throw new Error('Google returned no access token')
  if (token.refresh_token) {
    const { error } = await admin.from('mail_connections').update({
      refresh_token_encrypted: encryptToken(token.refresh_token, settings.key),
      updated_at: new Date().toISOString(),
    }).eq('owner_id', connection.owner_id)
    if (error) throw new Error('Could not save rotated Gmail token')
  }
  return token.access_token
}

export async function gmailRequest(path, accessToken, options = {}) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...options, headers: { Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Gmail request failed (${response.status})`)
  return response.json()
}

export const validCollegeRecipient = address => /^[^\s@]+@heraldcollege\.edu\.np$/i.test(address)

export function parseGmailMessage(message) {
  const headers = Object.fromEntries((message.payload?.headers || [])
    .map(header => [String(header.name || '').toLowerCase(), String(header.value || '')]))
  const sender = headers.from || ''
  const senderAddress = (/<([^<>]+)>/.exec(sender)?.[1] || sender).trim().toLowerCase()
  if (!validCollegeRecipient(senderAddress)) return null
  const parts = []
  const htmlParts = []
  const attachmentNames = []
  const attachments = []
  const visit = part => {
    if (!part) return
    if (part.filename) {
      const name = String(part.filename).slice(0, 180)
      attachmentNames.push(name)
      attachments.push({ name, mimeType: String(part.mimeType || ''),
        attachmentId: part.body?.attachmentId || null, data: part.body?.data || null,
        size: Number(part.body?.size || 0) })
    }
    if (part.mimeType === 'text/plain' && part.body?.data)
      parts.push(Buffer.from(part.body.data, 'base64url').toString('utf8'))
    if (part.mimeType === 'text/html' && part.body?.data)
      htmlParts.push(Buffer.from(part.body.data, 'base64url').toString('utf8'))
    for (const child of part.parts || []) visit(child)
  }
  visit(message.payload)
  const htmlText = htmlParts.join('\n').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()
  const body = (parts.join('\n').trim() || htmlText || String(message.snippet || '')).slice(0, 20000)
  const timestamp = Number(message.internalDate)
  return { id: String(message.id || ''), threadId: String(message.threadId || ''),
    sender, subject: (headers.subject || '(No subject)').slice(0, 500), body,
    receivedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    attachmentNames: [...new Set(attachmentNames)], attachments,
  }
}

export async function extractNotice(message) {
  const endpoint = process.env.UNISYNC_N8N_MAIL_EXTRACT_URL
  const secret = process.env.UNISYNC_N8N_MAIL_EXTRACT_SECRET
  if (!endpoint || !secret) throw new Error('Mail extraction workflow is not configured')
  const url = new URL(endpoint)
  if (url.protocol !== 'https:') throw new Error('Mail extraction workflow must use HTTPS')
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-UniSync-Mail-Secret': secret },
    body: JSON.stringify({ subject: message.subject, sender: message.sender,
      body: message.body, receivedAt: message.receivedAt,
      attachmentNames: message.attachmentNames }),
    signal: AbortSignal.timeout(18000),
  })
  if (!response.ok) throw new Error('Mail extraction workflow failed')
  const payload = await response.json()
  const result = Array.isArray(payload) ? payload[0] : payload
  const raw = result.output || result
  const summary = String(raw.summary || '').trim().slice(0, 1200)
  if (!summary) throw new Error('Mail extraction returned no summary')
  const categories = ['Payments', 'Exams', 'Academics', 'Campus life', 'General']
  const eventCategories = ['Exam', 'Deadline', 'College event', 'Holiday']
  const events = (Array.isArray(raw.events) ? raw.events : []).slice(0, 10)
    .map(event => ({ title: String(event.title || '').trim().slice(0, 200),
      event_date: String(event.date || '').slice(0, 10),
      start_time: /^\d{2}:\d{2}$/.test(event.start_time || '') ? event.start_time : null,
      end_time: /^\d{2}:\d{2}$/.test(event.end_time || '') ? event.end_time : null,
      location: event.location ? String(event.location).slice(0, 200) : null,
      category: eventCategories.includes(event.category) ? event.category : 'College event',
      description: String(event.description || '').slice(0, 1000) }))
    .filter(event => event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.event_date)
      && !Number.isNaN(Date.parse(`${event.event_date}T00:00:00Z`)))
  return { summary, category: categories.includes(raw.category) ? raw.category : 'General',
    priority: raw.priority === 'High' ? 'High' : 'Normal', events }
}

export function rfc822Message(job, sender) {
  if (!validCollegeRecipient(job.recipient)) throw new Error('Invalid college recipient')
  const subject = String(job.subject || '').replace(/[\r\n]/g, ' ').trim()
  const safeSender = String(sender || '').replace(/[\r\n]/g, '')
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
  const raw = `From: ${safeSender}\r\nTo: ${job.recipient}\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(String(job.message || ''), 'utf8').toString('base64')}`
  return Buffer.from(raw, 'utf8').toString('base64url')
}
