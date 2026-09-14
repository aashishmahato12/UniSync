import { supabase } from './supabase'

const bucket = 'payment-receipts'
const signedUrlLifetimeSeconds = 7 * 24 * 60 * 60

export type ReceiptJob = {
  id: string
  payment_id: string
  transaction_id: string
  status: 'queued' | 'processing' | 'sent' | 'failed'
  gmail_message_id: string | null
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export type ReceiptSendingSettings = {
  enabled: boolean
  recipient_label: string | null
}

export type ReceiptRequest = {
  paymentId: string
  paymentTitle: string
  amount: number
  paidOn: string
  transactionId: string
  paymentType: string
  body: string
  file: File
}

export async function getReceiptSendingSettings(): Promise<ReceiptSendingSettings> {
  const { data, error } = await supabase
    .from('payment_receipt_settings')
    .select('enabled,recipient_label')
    .eq('id', true)
    .single()
  if (error) throw error
  return data as ReceiptSendingSettings
}

export async function getReceiptJobs(): Promise<ReceiptJob[]> {
  const { data, error } = await supabase
    .from('payment_receipt_jobs')
    .select('id,payment_id,transaction_id,status,gmail_message_id,error_message,created_at,sent_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data || []) as ReceiptJob[]
}

export async function queueReceipt(request: ReceiptRequest): Promise<ReceiptJob> {
  const { data: userResult, error: authError } = await supabase.auth.getUser()
  const user = userResult.user
  if (authError || !user) throw new Error('Please sign in again before sending a receipt.')

  const extension = request.file.type === 'application/pdf'
    ? 'pdf'
    : request.file.type === 'image/png' ? 'png' : 'jpg'
  const receiptPath = `${user.id}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(receiptPath, request.file, {
      cacheControl: '0',
      contentType: request.file.type,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(receiptPath, signedUrlLifetimeSeconds)
  if (signError || !signed?.signedUrl) throw signError || new Error('Could not prepare receipt attachment.')

  const { data, error } = await supabase
    .from('payment_receipt_jobs')
    .insert({
      owner_id: user.id,
      payment_id: request.paymentId,
      payment_title: request.paymentTitle,
      amount: request.amount,
      paid_on: request.paidOn,
      transaction_id: request.transactionId.trim(),
      payment_type: request.paymentType,
      email_body: request.body.trim(),
      receipt_path: receiptPath,
      receipt_name: request.file.name.slice(0, 180),
      receipt_mime: request.file.type,
      signed_receipt_url: signed.signedUrl,
    })
    .select('id,payment_id,transaction_id,status,gmail_message_id,error_message,created_at,sent_at')
    .single()
  if (error) throw error
  return data as ReceiptJob
}

