import { supabase } from './supabase'
import { getMailConnection } from './mailConnection'

const bucket = 'payment-receipts'

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
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user?.email) throw new Error('Sign in before checking receipt delivery.')
  const connection = await getMailConnection()
  return { enabled: connection.status === 'connected',
    recipient_label: 'aashishmahato8000@gmail.com' }
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

  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.access_token) throw new Error('Sign in again before sending a receipt.')
  const response = await fetch('/api/payment-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session.access_token}` },
    body: JSON.stringify({
      paymentId: request.paymentId, paymentTitle: request.paymentTitle,
      amount: request.amount, paidOn: request.paidOn,
      transactionId: request.transactionId.trim(), paymentType: request.paymentType,
      body: request.body.trim(), receiptPath, receiptName: request.file.name.slice(0, 180),
      receiptMime: request.file.type,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Could not queue the receipt.')
  return result as ReceiptJob
}

