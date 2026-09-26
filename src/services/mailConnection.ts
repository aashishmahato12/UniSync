import { supabase } from './supabase'

export type MailConnection = {
  status: 'connected' | 'reconnect_required' | 'not_connected'
  email?: string
  lastSyncedAt?: string | null
}

async function requestMail(method: 'GET' | 'POST' | 'DELETE'): Promise<MailConnection & { url?: string }> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) throw new Error('Sign in again to manage Gmail.')
  const response = await fetch('/api/mail', {
    method, headers: { Authorization: `Bearer ${session.session.access_token}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Could not manage Gmail connection.')
  return result
}

export const getMailConnection = () => requestMail('GET')
export const disconnectMail = () => requestMail('DELETE')
export async function connectMail() {
  const result = await requestMail('POST')
  if (!result.url || new URL(result.url).hostname !== 'accounts.google.com')
    throw new Error('Google sign-in could not start.')
  window.location.assign(result.url)
}
