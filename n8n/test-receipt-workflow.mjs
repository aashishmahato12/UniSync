import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const workflow = JSON.parse(readFileSync(join(dir, 'payment-receipts-to-gmail.json'), 'utf8'))
const named = name => workflow.nodes.find(node => node.name === name)
const codeNodes = workflow.nodes.filter(node => node.type === 'n8n-nodes-base.code')
for (const node of codeNodes) {
  assert.doesNotThrow(() => new Function('$input', node.parameters.jsCode), node.name)
  assert.ok(node.parameters.jsCode.includes('\n'), node.name + ' must contain real line breaks')
}
assert.equal(named('Prepare Receipt Email').parameters.jsCode,
  readFileSync(join(dir, 'prepare-receipt-email.js'), 'utf8'))
assert.equal(named('Name Receipt Attachment').parameters.jsCode,
  readFileSync(join(dir, 'name-receipt-attachment.js'), 'utf8'))

const prepare = new Function('$input', named('Prepare Receipt Email').parameters.jsCode)
const path = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf'
const job = {
  id: '33333333-3333-4333-8333-333333333333',
  payment_id: 'semester-1',
  payment_title: '1st semester',
  amount: 264500,
  paid_on: '2026-09-14',
  transaction_id: 'TEST-123',
  payment_type: 'Mobile banking',
  email_body: 'Please find my receipt attached.',
  receipt_path: path,
  receipt_name: 'test-receipt.pdf',
  receipt_mime: 'application/pdf',
  signed_receipt_url: 'https://qozetqmklegcnjgxtgpd.supabase.co/storage/v1/object/sign/payment-receipts/' + path + '?token=test',
  status: 'processing',
}
const result = prepare({ item: { json: job } }).json
assert.match(result.recipient, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
assert.match(result.subject, /^Herald College/)
assert.match(result.message, /\nPayment details\n/)
assert.equal(result.receiptUrl, job.signed_receipt_url)
assert.throws(() => prepare({ item: { json: {
  ...job, signed_receipt_url: 'https://example.com/receipt?token=test',
} } }), /Receipt URL/)
assert.equal(named('Send Receipt via Gmail').parameters.options.attachmentsUi.attachmentsBinary[0].property, 'data')
assert.equal(workflow.active, false)
console.log('Receipt workflow checks passed')

