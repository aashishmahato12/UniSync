import { randomBytes } from 'node:crypto'
import { adminClient, callbackUrl, config, decryptToken, json, signedInUser, stateHash } from '../mail-core.mjs'

const legacyMailbox = 'mahatoaashish5@gmail.com'

export default { async fetch(request) {
  const settings = config()
  if (!settings) return json({ error: 'Gmail connection is not configured yet.' }, 503)
  const admin = adminClient(settings)
  const user = await signedInUser(request, admin)
  if (!user) return json({ error: 'Sign in before managing your mailbox.' }, 401)

  if (request.method === 'GET') {
    const { data, error } = await admin.from('mail_connections')
      .select('mailbox_email,status,last_synced_at').eq('owner_id', user.id).maybeSingle()
    if (error) return json({ error: 'Could not check mailbox connection.' }, 502)
    if (data) return json({ status: data.status, email: data.mailbox_email,
      lastSyncedAt: data.last_synced_at })
    if (user.email.toLowerCase() === legacyMailbox) return json({ status: 'legacy', email: legacyMailbox })
    return json({ status: 'not_connected' })
  }

  if (request.method === 'POST') {
    if (user.email.toLowerCase() === legacyMailbox)
      return json({ error: 'This account already uses the original Gmail workflow.' }, 409)
    await admin.from('mail_oauth_states').delete().lt('expires_at', new Date().toISOString())
    const state = randomBytes(32).toString('base64url')
    const { error } = await admin.from('mail_oauth_states').insert({
      state_hash: stateHash(state), owner_id: user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (error) return json({ error: 'Could not start Gmail connection.' }, 502)
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({ client_id: settings.googleClientId,
      redirect_uri: callbackUrl(settings), response_type: 'code', state,
      access_type: 'offline', prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
    }).toString()
    return json({ url: url.toString() })
  }

  if (request.method === 'DELETE') {
    const { data, error } = await admin.from('mail_connections')
      .delete().eq('owner_id', user.id).select('refresh_token_encrypted').maybeSingle()
    if (error) return json({ error: 'Could not disconnect Gmail.' }, 502)
    // Best-effort revocation. The local token is deleted even if Google is offline.
    if (data?.refresh_token_encrypted) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: decryptToken(data.refresh_token_encrypted, settings.key) }),
          signal: AbortSignal.timeout(5000),
        })
      } catch { /* Local disconnection still takes effect. */ }
    }
    return json({ status: 'not_connected' })
  }

  return json({ error: 'Method not allowed.' }, 405)
} }
