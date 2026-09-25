import { adminClient, config, encryptToken, gmailRequest, googleTokenFromCode, stateHash } from '../mail-core.mjs'

const finish = (origin, result) => Response.redirect(`${origin}/?mail=${result}`, 302)

export default { async fetch(request) {
  const settings = config()
  if (!settings) return new Response('Gmail connection is not configured.', { status: 503 })
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.has('error')) return finish(settings.origin, 'cancelled')
  if (!code || !state || state.length > 100) return finish(settings.origin, 'failed')
  const admin = adminClient(settings)
  const { data: ownerId, error } = await admin.rpc('consume_mail_oauth_state', {
    p_state_hash: stateHash(state),
  })
  if (error || !ownerId) return finish(settings.origin, 'failed')

  try {
    const tokens = await googleTokenFromCode(code, settings)
    const granted = String(tokens.scope || '').split(/\s+/)
    if (!tokens.refresh_token || !tokens.access_token ||
      !granted.includes('https://www.googleapis.com/auth/gmail.readonly') ||
      !granted.includes('https://www.googleapis.com/auth/gmail.send'))
      return finish(settings.origin, 'failed')
    const profile = await gmailRequest('profile', tokens.access_token)
    const mailboxEmail = String(profile.emailAddress || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailboxEmail))
      return finish(settings.origin, 'failed')
    const { error: saveError } = await admin.from('mail_connections').upsert({
      owner_id: ownerId, mailbox_email: mailboxEmail,
      refresh_token_encrypted: encryptToken(tokens.refresh_token, settings.key),
      status: 'connected', last_synced_at: null,
      connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' })
    if (saveError) {
      console.error('Could not save Gmail connection', saveError.code)
      return finish(settings.origin, 'failed')
    }
    return finish(settings.origin, 'connected')
  } catch (caught) {
    console.error('Gmail OAuth callback failed', caught instanceof Error ? caught.message : 'unknown')
    return finish(settings.origin, 'failed')
  }
} }
