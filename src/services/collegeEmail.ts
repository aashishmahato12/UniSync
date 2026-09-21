import { supabase } from './supabase'

export type CollegeEmailJob = {
  id: string
  recipient: string
  subject: string
  message: string
  status: 'queued' | 'processing' | 'sent' | 'failed'
  gmail_message_id: string | null
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export async function getCollegeEmailJobs(): Promise<CollegeEmailJob[]> {
  const { data, error } = await supabase
    .from('college_email_jobs')
    .select('id,recipient,subject,message,status,gmail_message_id,error_message,created_at,sent_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return (data ?? []) as CollegeEmailJob[]
}

export async function queueCollegeEmail(recipient: string, subject: string, message: string): Promise<CollegeEmailJob> {
  const cleanRecipient = recipient.trim().toLowerCase()
  if (!/^[^\s@]+@heraldcollege\.edu\.np$/.test(cleanRecipient)) {
    throw new Error('Use a verified @heraldcollege.edu.np email address.')
  }
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in again before sending an email.')
  const { data, error } = await supabase
    .from('college_email_jobs')
    .insert({ owner_id: userData.user.id, recipient: cleanRecipient, subject: subject.trim(), message: message.trim() })
    .select('id,recipient,subject,message,status,gmail_message_id,error_message,created_at,sent_at')
    .single()
  if (error) throw error
  return data as CollegeEmailJob
}
