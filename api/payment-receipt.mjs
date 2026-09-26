import { adminClient, config, json, signedInUser } from '../mail-core.mjs'

const allowedPayments = new Set(['admission', 'semester-1', 'semester-2', 'semester-3',
  'semester-4', 'semester-5', 'semester-6'])
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const allowedMethods = new Set(['Mobile banking', 'Bank transfer', 'eSewa', 'Khalti', 'Other'])

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const settings = config()
  if (!settings) return json({ error: 'Receipt delivery is not configured.' }, 503)
  const admin = adminClient(settings)
  const user = await signedInUser(request, admin)
  if (!user) return json({ error: 'Sign in before sending a receipt.' }, 401)
  if (user.email.trim().toLowerCase() === 'mahatoaashish5@gmail.com')
    return json({ error: 'This account uses the original receipt workflow.' }, 403)
  const { data: connection, error: connectionError } = await admin.from('mail_connections')
    .select('status').eq('owner_id', user.id).maybeSingle()
  if (connectionError || connection?.status !== 'connected')
    return json({ error: 'Connect your Gmail before sending a receipt.' }, 403)

  let input
  try { input = await request.json() } catch { return json({ error: 'Invalid receipt details.' }, 400) }
  const paymentId = String(input.paymentId || '')
  const paymentTitle = String(input.paymentTitle || '').trim()
  const amount = Number(input.amount)
  const paidOn = String(input.paidOn || '')
  const transactionId = String(input.transactionId || '').trim()
  const paymentType = String(input.paymentType || '')
  const body = String(input.body || '').trim()
  const receiptPath = String(input.receiptPath || '')
  const receiptName = String(input.receiptName || '')
  const receiptMime = String(input.receiptMime || '')
  if (!allowedPayments.has(paymentId) || paymentTitle.length < 1 || paymentTitle.length > 120 ||
    !Number.isFinite(amount) || amount <= 0 || amount > 2000000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`)) ||
    transactionId.length < 3 || transactionId.length > 120 || !allowedMethods.has(paymentType) ||
    body.length < 10 || body.length > 10000 || receiptName.length < 1 || receiptName.length > 180 ||
    !allowedTypes.has(receiptMime) || !receiptPath.startsWith(`${user.id}/`) ||
    receiptPath.length < 40 || receiptPath.length > 300)
    return json({ error: 'Check the receipt details and try again.' }, 400)

  const { data: file, error: fileError } = await admin.storage.from('payment-receipts').download(receiptPath)
  if (fileError || !file || file.size < 1 || file.size > 10 * 1024 * 1024)
    return json({ error: 'Receipt file is missing or too large.' }, 400)
  const { data: signed, error: signError } = await admin.storage.from('payment-receipts')
    .createSignedUrl(receiptPath, 7 * 24 * 60 * 60)
  if (signError || !signed?.signedUrl) return json({ error: 'Could not prepare receipt file.' }, 502)
  const { data: job, error: saveError } = await admin.from('payment_receipt_jobs').insert({
    owner_id: user.id, payment_id: paymentId, payment_title: paymentTitle, amount,
    paid_on: paidOn, transaction_id: transactionId, payment_type: paymentType,
    email_body: body, receipt_path: receiptPath, receipt_name: receiptName,
    receipt_mime: receiptMime, signed_receipt_url: signed.signedUrl,
  }).select('id,payment_id,transaction_id,status,gmail_message_id,error_message,created_at,sent_at').single()
  if (saveError) return json({ error: saveError.code === '23505'
    ? 'That transaction ID already has a receipt request.' : 'Could not queue the receipt.' }, 502)
  return json(job, 201)
} }
