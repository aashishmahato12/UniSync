import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const dir = dirname(fileURLToPath(import.meta.url))
const run = (name, input, lookup = () => null, binary = {}) =>
  new Function('$json', '$', '$input', readFileSync(join(dir, name), 'utf8'))(
    input, lookup, { item: { json: input, binary } })
const message = {
  id: 'gmail-test-001', threadId: 'thread-test-001', internalDate: String(Date.parse('2026-09-12T08:00:00Z')),
  payload: { headers: [{name:'Subject', value:'Semester fee due 18 September'}, {name:'From', value:'Accounts Office <accounts@heraldcollege.edu.np>'}], parts: [
    { mimeType:'text/plain', body:{ data: Buffer.from('Pay your semester fee by 18 September 2026. Send the receipt to accounts.').toString('base64url') } },
    { mimeType:'application/pdf', filename:'fee-instructions.pdf', body:{} },
  ] },
}
const prepared = run('prepare-email.js', message)
assert.equal(prepared.json.gmail_message_id, message.id)
assert.deepEqual(prepared.json.attachment_names, ['fee-instructions.pdf'])
assert.equal(prepared.json.body_text, 'Pay your semester fee by 18 September 2026. Send the receipt to accounts.')
assert.match(prepared.json.ai_input, /Pay your semester fee/)
assert.throws(() => run('prepare-email.js', { ...message, from: 'Fake Office <accounts@other.example>' }), /outside the Herald College domain/)
const parsed = run('prepare-email.js', { id: 'parsed-001', subject: 'Class update', from: { text: 'Academic Office <academic@heraldcollege.edu.np>', value: [{ address: 'academic@heraldcollege.edu.np' }] }, text: 'Classes begin Monday.', date: '2026-09-13T06:00:00Z' })
assert.equal(parsed.json.sender, 'Academic Office <academic@heraldcollege.edu.np>')
assert.match(parsed.json.ai_input, /Classes begin Monday/)
const attachmentOnly = run('prepare-email.js', {
  id: 'gmail-test-002', subject: 'Important notice',
  from: 'Office <office@heraldcollege.edu.np>', text: '',
  date: '2026-09-13T06:00:00Z',
}, () => null, { attachment_0: { fileName: 'exam-notice.pdf' } })
assert.deepEqual(attachmentOnly.json.attachment_names, ['exam-notice.pdf'])
assert.equal(attachmentOnly.json.attachment_only, true)
assert.match(attachmentOnly.json.ai_input, /Do not invent/)
const attachmentValidated = run('validate-extraction.js', {
  output: { summary: 'Invented deadline tomorrow', category: 'Exams', priority: 'High',
    events: [{ title: 'Invented exam', date: '2026-09-18' }] },
}, () => ({ item: attachmentOnly }))
assert.match(attachmentValidated.json.notice.summary, /Open the file/)
assert.equal(attachmentValidated.json.events.length, 0)

const extraction = { output: { summary:'Semester fee is due 18 September 2026. Send the receipt after paying.', category:'Payments', priority:'High', events:[
  {title:'Semester fee deadline', date:'2026-09-18', start_time:'', end_time:'', location:'', category:'Deadline', description:'Pay semester fee.'},
  {title:'Ambiguous meeting', date:'soon', category:'College event'},
] } }
const lookup = name => ({ item: prepared, all: () => [{ json: validated.json }] })
const validated = run('validate-extraction.js', extraction, lookup)
assert.equal(validated.json.notice.priority, 'High')
assert.equal(validated.json.notice.body_text, prepared.json.body_text)
assert.equal(validated.json.events.length, 1)
assert.equal(validated.json.events[0].calendar_state, 'Pending')
const split = new Function('$input', '$', readFileSync(join(dir, 'split-events.js'), 'utf8'))({all:()=>[]}, lookup)
assert.equal(split.length, 1)
assert.equal(split[0].json.event_key, 'gmail-test-001:0')

const workflow = JSON.parse(readFileSync(join(dir, 'heritage-gmail-to-supabase.json'), 'utf8'))
const names = new Set(workflow.nodes.map(node => node.name))
for (const [name, connection] of Object.entries(workflow.connections)) {
  assert(names.has(name))
  for (const groups of Object.values(connection)) for (const group of groups) for (const edge of group) assert(names.has(edge.node))
}
assert.equal(workflow.active, false)
assert.equal(workflow.nodes.find(node => node.name === 'Get Full Email').parameters.options.downloadAttachments, true)
console.log('n8n preparation, validation, and workflow structure pass')
