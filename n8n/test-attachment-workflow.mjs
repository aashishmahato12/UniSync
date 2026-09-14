import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const workflow = JSON.parse(readFileSync(join(dir, 'college-attachments-to-supabase.json'), 'utf8'))
const splitSource = readFileSync(join(dir, 'split-college-attachments.js'), 'utf8')
assert.equal(workflow.active, false)
assert.equal(workflow.nodes.find(node => node.name === 'Split Attachments').parameters.jsCode, splitSource)
assert.equal(workflow.nodes.find(node => node.name === 'Get Email Attachments').parameters.options.downloadAttachments, true)
assert.equal(workflow.nodes.find(node => node.name === 'Get Recent Attachment Emails').parameters.options.downloadAttachments, true)
assert.equal(workflow.nodes.find(node => node.name === 'Upload Private File').parameters.contentType, 'binaryData')
assert(!workflow.nodes.some(node => node.credentials))

const split = new Function('$input', splitSource)
const email = {
  id: '18abcdef12345678',
  subject: 'New routine',
  from: { text: 'College <office@heraldcollege.edu.np>',
    value: [{ address: 'office@heraldcollege.edu.np' }] },
  date: '2026-09-14T06:00:00Z',
}
const items = split({ all: () => [{
  json: email,
  binary: {
    attachment_0: { fileName: 'routine.pdf', mimeType: 'application/pdf', fileSize: '120 KB' },
    attachment_1: { fileName: 'inline.gif', mimeType: 'image/gif', fileSize: '20 KB' },
  },
}] })
assert.equal(items.length, 1)
assert.equal(items[0].json.storage_path, '18abcdef12345678/0-routine.pdf')
assert.equal(items[0].json.size_bytes, 122880)
assert.equal(items[0].binary.data.fileName, 'routine.pdf')
assert.throws(() => split({ all: () => [{ json: { ...email,
  from: 'Fake <office@example.com>' }, binary: {} }] }), /outside the Herald College domain/)
console.log('Attachment workflow checks passed')
