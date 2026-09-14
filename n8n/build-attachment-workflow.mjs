import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const code = name => readFileSync(join(dir, name), 'utf8')
const node = (id, name, type, typeVersion, position, parameters) =>
  ({ id, name, type, typeVersion, position, parameters })
const link = (name, next) => ({ [name]: { main: [[{ node: next, type: 'main', index: 0 }]] } })
const supabase = 'https://qozetqmklegcnjgxtgpd.supabase.co'

const workflow = {
  name: 'Herald College — save Gmail attachments privately',
  nodes: [
    node('bbca0e2f-7b5e-4000-a267-88f0647f96e1', 'Gmail Attachment Trigger',
      'n8n-nodes-base.gmailTrigger', 1.3, [0, 0], {
        pollTimes: { item: [{ mode: 'everyX', value: 5, unit: 'minutes' }] },
        simple: true,
        filters: { q: 'from:(@heraldcollege.edu.np) has:attachment' },
        options: {},
      }),
    node('0735e61e-1f58-4f32-ae37-717805362eaa', 'Manual Backfill',
      'n8n-nodes-base.manualTrigger', 1, [0, 240], {}),
    node('9cf32f83-aa81-47ac-8e23-17a00a4a7d96', 'Get Recent Attachment Emails',
      'n8n-nodes-base.gmail', 2.1, [220, 240], {
        resource: 'message', operation: 'getAll', returnAll: false, limit: 20,
        filters: { q: 'from:(@heraldcollege.edu.np) has:attachment' },
        simple: false,
        options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' },
      }),
    node('d037e886-96dd-419d-a7c6-66389e5b2c7d', 'Get Email Attachments',
      'n8n-nodes-base.gmail', 2.1, [220, 0], {
        resource: 'message', operation: 'get', messageId: '={{ $json.id }}',
        simple: false,
        options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' },
      }),
    node('28150dc8-f601-4b6f-8b7f-371cce133a0d', 'Split Attachments',
      'n8n-nodes-base.code', 2, [440, 0], {
        mode: 'runOnceForAllItems', jsCode: code('split-college-attachments.js'),
      }),
    node('784dc207-5035-4b25-b557-d0a8b4a03014', 'Upload Private File',
      'n8n-nodes-base.httpRequest', 4.2, [660, 0], {
        method: 'POST',
        url: '={{ "' + supabase + '/storage/v1/object/college-attachments/" + $json.storage_path.split("/").map(encodeURIComponent).join("/") }}',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Content-Type', value: '={{ $json.mime_type }}' },
          { name: 'x-upsert', value: 'true' },
        ] },
        sendBody: true,
        contentType: 'binaryData',
        inputDataFieldName: 'data',
        options: { timeout: 30000 },
      }),
    node('1ac13df5-d996-4990-8034-53e8152001a8', 'Restore File Metadata',
      'n8n-nodes-base.code', 2, [880, 0], {
        mode: 'runOnceForEachItem', jsCode: code('attachment-metadata.js'),
      }),
    node('86413b5b-c009-41c1-91bb-279b48e56e3f', 'Save Document Row',
      'n8n-nodes-base.httpRequest', 4.2, [1100, 0], {
        method: 'POST',
        url: supabase + '/rest/v1/college_attachments?on_conflict=gmail_message_id,attachment_index',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'Prefer', value: 'resolution=merge-duplicates,return=representation' },
          { name: 'Content-Type', value: 'application/json' },
        ] },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ $json }}',
        options: { timeout: 15000 },
      }),
  ],
  connections: {
    ...link('Gmail Attachment Trigger', 'Get Email Attachments'),
    ...link('Manual Backfill', 'Get Recent Attachment Emails'),
    ...link('Get Recent Attachment Emails', 'Split Attachments'),
    ...link('Get Email Attachments', 'Split Attachments'),
    ...link('Split Attachments', 'Upload Private File'),
    ...link('Upload Private File', 'Restore File Metadata'),
    ...link('Restore File Metadata', 'Save Document Row'),
  },
  pinData: {},
  settings: { executionOrder: 'v1', timezone: 'Asia/Kathmandu' },
  active: false,
  tags: [],
}
writeFileSync(join(dir, 'college-attachments-to-supabase.json'),
  JSON.stringify(workflow, null, 2) + '\n')
