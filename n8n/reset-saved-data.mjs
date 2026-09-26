// Fresh-start tool for UniSync. Accounts, Gmail connections, tables, and
// storage bucket definitions are deliberately preserved.
import { createClient } from '@supabase/supabase-js'

const expectedProject = 'qozetqmklegcnjgxtgpd'
const execute = process.argv.includes('--execute')
if (execute && !process.argv.includes('--timers-paused'))
  throw new Error('Unpublish the connected-mail timer and old writers first; then add --timers-paused.')
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally.')
if (new URL(url).hostname !== `${expectedProject}.supabase.co`)
  throw new Error(`Refusing to use a project other than ${expectedProject}.`)

const admin = createClient(url, key, { auth: { persistSession: false } })
const tables = [
  'college_email_jobs', 'payment_receipt_jobs', 'user_calendar_events',
  'user_documents', 'college_attachments', 'college_events', 'college_notices',
]
const buckets = ['payment-receipts', 'user-documents', 'college-attachments']
const missing = new Set(['42P01', 'PGRST205'])

for (const table of tables) {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true })
  if (error && !missing.has(error.code)) throw new Error(`${table}: ${error.message}`)
  console.log(`${table}: ${error ? 'not installed' : count} rows`)
}
console.log(`Files in these buckets will be removed: ${buckets.join(', ')}`)
console.log('Accounts, Gmail connections, tables, and bucket definitions will remain.')
if (!execute) {
  console.log('Dry run only. Pause the n8n mail timer, then rerun with --execute.')
  process.exit(0)
}

// The timer and old writers must already be unpublished. Storage API deletion
// removes actual file bytes; deleting only storage.objects rows would not.
for (const bucket of buckets) {
  const { error } = await admin.storage.emptyBucket(bucket)
  if (error) throw new Error(`Could not empty ${bucket}: ${error.message}`)
  console.log(`Emptied ${bucket}`)
}
for (const table of tables) {
  const { error } = await admin.from(table).delete().not('id', 'is', null)
  if (error && !missing.has(error.code)) throw new Error(`Could not clear ${table}: ${error.message}`)
  const { count, error: verifyError } = await admin.from(table)
    .select('id', { count: 'exact', head: true })
  if (verifyError && !missing.has(verifyError.code))
    throw new Error(`Could not verify ${table}: ${verifyError.message}`)
  if (count) throw new Error(`${table} still has ${count} rows; stop and inspect before resuming sync.`)
  console.log(`Cleared ${table}`)
}
const { error: syncError } = await admin.from('mail_connections')
  .update({ last_synced_at: null, updated_at: new Date().toISOString() })
  .not('owner_id', 'is', null)
if (syncError) throw new Error(`Could not reset sync order: ${syncError.message}`)
console.log('Saved app data cleared. Resume the connected-mail timer to re-import old Herald mail.')
