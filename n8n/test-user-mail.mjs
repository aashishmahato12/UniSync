import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { decryptToken, encryptToken, parseGmailMessage, rfc822Message,
  rfc822ReceiptMessage } from '../mail-core.mjs'
import { messageKey, usesLegacySender } from '../api/mail-sync.mjs'

test('original Gmail imports stay separate between main and test accounts', () => {
  assert.equal(messageKey({ owner_id: 'owner-1', original_owner_id: 'owner-1',
    mailbox_email: 'mahatoaashish5@gmail.com' }, 'gmail-1'), 'gmail-1')
  assert.equal(messageKey({ owner_id: 'owner-2', original_owner_id: 'owner-1',
    mailbox_email: 'mahatoaashish5@gmail.com' }, 'gmail-1'), 'owner-2:gmail-1')
  assert.equal(messageKey({ owner_id: 'owner-2', mailbox_email: 'student@gmail.com' }, 'gmail-1'), 'owner-2:gmail-1')
  assert.equal(messageKey({ owner_id: 'owner-2', mailbox_email: 'mahatoaashish5@gmail.com' }, 'gmail-1'), 'owner-2:gmail-1')
})

test('the legacy sender handles only the original owner, not another connected account', () => {
  assert.equal(usesLegacySender({ owner_id: 'owner-1', original_owner_id: 'owner-1' }), true)
  assert.equal(usesLegacySender({ owner_id: 'owner-2', original_owner_id: 'owner-1' }), false)
})

test('Gmail refresh tokens are encrypted and authenticated', () => {
  const key = randomBytes(32)
  const token = 'private-refresh-token'
  const encrypted = encryptToken(token, key)
  assert.equal(decryptToken(encrypted, key), token)
  assert.equal(encrypted.includes(token), false)
  assert.throws(() => decryptToken(encrypted, randomBytes(32)))
})

test('only Herald messages are accepted for an account inbox', () => {
  const message = { id: 'abc123', internalDate: '1790000000000', payload: {
    headers: [{ name: 'From', value: 'College <office@heraldcollege.edu.np>' },
      { name: 'Subject', value: 'Exam update' }],
    parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('Your exam is tomorrow.').toString('base64url') } },
      { filename: 'schedule.pdf', mimeType: 'application/pdf', body: { attachmentId: 'file1', size: 20 } }],
  } }
  const parsed = parseGmailMessage(message)
  assert.equal(parsed.subject, 'Exam update')
  assert.equal(parsed.body, 'Your exam is tomorrow.')
  assert.equal(parsed.attachments[0].attachmentId, 'file1')
  message.payload.headers[0].value = 'Outside <office@example.com>'
  assert.equal(parseGmailMessage(message), null)
})

test('outgoing mail uses the authorized college recipient and encodes subject', () => {
  assert.throws(() => rfc822Message({ recipient: 'elsewhere@example.com', subject: 'Hello', message: 'Hi' }, 'me@gmail.com'))
  const raw = rfc822Message({ recipient: 'office@heraldcollege.edu.np',
    subject: 'Hi\r\nBcc: attacker@example.com', message: 'Hello college' }, 'me@gmail.com')
  const decoded = Buffer.from(raw, 'base64url').toString('utf8')
  assert.match(decoded, /To: office@heraldcollege\.edu\.np/)
  assert.doesNotMatch(decoded, /\r\nBcc:/)
  assert.match(decoded, /SGVsbG8gY29sbGVnZQ==/)
})

test('test receipts include an attachment and can only target the test inbox', () => {
  const job = { payment_title: '1st semester', email_body: 'Sample receipt only',
    amount: 100, paid_on: '2026-09-26', payment_type: 'Bank transfer',
    transaction_id: 'TEST-1', receipt_name: 'sample.pdf', receipt_mime: 'application/pdf' }
  const file = Buffer.from('%PDF-1.4\nsample')
  assert.throws(() => rfc822ReceiptMessage(job, 'student@gmail.com', 'fee@heraldcollege.edu.np', file))
  const raw = rfc822ReceiptMessage(job, 'student@gmail.com',
    'aashishmahato8000@gmail.com', file)
  const decoded = Buffer.from(raw, 'base64url').toString('utf8')
  assert.match(decoded, /To: aashishmahato8000@gmail\.com/)
  assert.match(decoded, /Content-Disposition: attachment; filename="sample\.pdf"/)
  assert.match(decoded, /JVBERi0xLjQ/)
})
