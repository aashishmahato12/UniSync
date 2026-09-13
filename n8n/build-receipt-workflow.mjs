import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const code = name => readFileSync(join(dir, name), 'utf8')
const node = (id, name, type, typeVersion, position, parameters, extras = {}) =>
  ({ id, name, type, typeVersion, position, parameters, ...extras })
const link = (name, next) => ({ [name]: { main: [[{ node: next, type: 'main', index: 0 }]] } })
const linkWithError = (name, next, error) => ({
  [name]: { main: [
    [{ node: next, type: 'main', index: 0 }],
    [{ node: error, type: 'main', index: 0 }],
  ] },
})
const base = 'https://qozetqmklegcnjgxtgpd.supabase.co/rest/v1/payment_receipt_jobs'
const jobId = "$('Claim Receipt').first().json.id"

const workflow = {
  name: 'UniSync — send payment receipts with Gmail',
  nodes: [
    node('b57470fe-9347-40b6-9151-8863b45bcdb1', 'Check Receipt Queue', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 0], {
      rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] },
    }),
    node('c7bc12c8-3c49-4d0b-9b2a-8f31d9e2cab9', 'Claim Receipt', 'n8n-nodes-base.httpRequest', 4.2, [220, 0], {
      method: 'POST',
      url: 'https://qozetqmklegcnjgxtgpd.supabase.co/rest/v1/rpc/claim_next_payment_receipt',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '{}',
      options: { timeout: 15000 },
    }),
    node('56139b47-a384-4f40-9868-38905e677e26', 'Prepare Receipt Email', 'n8n-nodes-base.code', 2, [440, 0], {
      mode: 'runOnceForEachItem',
      jsCode: code('prepare-receipt-email.js'),
    }, { onError: 'continueErrorOutput' }),
    node('a7c3e8d5-f759-4626-9fce-baf9fc996067', 'Download Private Receipt', 'n8n-nodes-base.httpRequest', 4.2, [660, 0], {
      method: 'GET',
      url: '={{ $json.receiptUrl }}',
      options: {
        timeout: 20000,
        response: { response: { responseFormat: 'file', outputPropertyName: 'data' } },
      },
    }, { onError: 'continueErrorOutput' }),
    node('c629246a-5d8b-4d7b-9979-9710f0c85853', 'Name Receipt Attachment', 'n8n-nodes-base.code', 2, [880, 0], {
      mode: 'runOnceForEachItem',
      jsCode: code('name-receipt-attachment.js'),
    }, { onError: 'continueErrorOutput' }),
    node('86a40d8e-c3e9-4e8b-a75e-b81b804b41a7', 'Send Receipt via Gmail', 'n8n-nodes-base.gmail', 2.1, [1100, 0], {
      resource: 'message',
      operation: 'send',
      sendTo: "={{ $('Prepare Receipt Email').first().json.recipient }}",
      subject: "={{ $('Prepare Receipt Email').first().json.subject }}",
      emailType: 'text',
      message: "={{ $('Prepare Receipt Email').first().json.message }}",
      options: {
        appendAttribution: false,
        attachmentsUi: { attachmentsBinary: [{ property: 'data' }] },
      },
    }, { onError: 'continueErrorOutput' }),
    node('435dce5d-1ee1-4244-a680-727442281b37', 'Check Gmail Result', 'n8n-nodes-base.code', 2, [1320, 0], {
      mode: 'runOnceForEachItem',
      jsCode: "const id = String($input.item.json.id || '');\nif (!id) throw new Error('Gmail did not return a message ID. Check Sent mail before retrying.');\nreturn { json: { gmailMessageId: id } };\n",
    }, { onError: 'continueErrorOutput' }),
    node('556ce358-1520-4fb4-9488-9ddfa59626cf', 'Mark Receipt Sent', 'n8n-nodes-base.httpRequest', 4.2, [1540, -120], {
      method: 'PATCH',
      url: '={{ "' + base + '?id=eq." + encodeURIComponent(' + jobId + ') + "&status=eq.processing" }}',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ { status: "sent", gmail_message_id: $json.gmailMessageId, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() } }}',
      options: { timeout: 15000 },
    }),
    node('73b93377-d7b9-4325-8178-5c59c81585eb', 'Mark Delivery Unconfirmed', 'n8n-nodes-base.httpRequest', 4.2, [1540, 240], {
      method: 'PATCH',
      url: '={{ "' + base + '?id=eq." + encodeURIComponent(' + jobId + ') + "&status=eq.processing" }}',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ { status: "failed", error_message: "Delivery not confirmed. Check Gmail Sent and the n8n execution before retrying.", updated_at: new Date().toISOString() } }}',
      options: { timeout: 15000 },
    }),
  ],
  connections: {
    ...link('Check Receipt Queue', 'Claim Receipt'),
    ...link('Claim Receipt', 'Prepare Receipt Email'),
    ...linkWithError('Prepare Receipt Email', 'Download Private Receipt', 'Mark Delivery Unconfirmed'),
    ...linkWithError('Download Private Receipt', 'Name Receipt Attachment', 'Mark Delivery Unconfirmed'),
    ...linkWithError('Name Receipt Attachment', 'Send Receipt via Gmail', 'Mark Delivery Unconfirmed'),
    ...linkWithError('Send Receipt via Gmail', 'Check Gmail Result', 'Mark Delivery Unconfirmed'),
    ...linkWithError('Check Gmail Result', 'Mark Receipt Sent', 'Mark Delivery Unconfirmed'),
  },
  pinData: {},
  settings: { executionOrder: 'v1', timezone: 'Asia/Kathmandu', saveExecutionProgress: true },
  active: false,
  tags: [],
}
writeFileSync(join(dir, 'payment-receipts-to-gmail.json'), JSON.stringify(workflow, null, 2) + '\n')

