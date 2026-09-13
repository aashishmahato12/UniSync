import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const dir = dirname(fileURLToPath(import.meta.url))
const run = (name, input, lookup = () => null) => new Function('$json', '$', readFileSync(join(dir, name), 'utf8'))(input, lookup)
const message = {
  id: 'gmail-test-001', threadId: 'thread-test-001', internalDate: String(Date.parse('2026-09-12T08:00:00Z')),
  payload: { headers: [{name:'Subject', value:'Semester fee due 18 September'}, {name:'From', value:'Accounts Office <accounts@heritage.example>'}], parts: [
    { mimeType:'text/plain', body:{ data: Buffer.from('Pay your semester fee by 18 September 2026. Send the receipt to accounts.').toString('base64url') } },
    { mimeType:'application/pdf', filename:'fee-instructions.pdf', body:{} },
  ] },
}
const prepared = run('prepare-email.js', message)
assert.equal(prepared.json.gmail_message_id, message.id)
assert.deepEqual(prepared.json.attachment_names, ['fee-instructions.pdf'])
assert.match(prepared.json.ai_input, /Pay your semester fee/)

const extraction = { output: { summary:'Semester fee is due 18 September 2026. Send the receipt after paying.', category:'Payments', priority:'High', events:[
  {title:'Semester fee deadline', date:'2026-09-18', start_time:'', end_time:'', location:'', category:'Deadline', description:'Pay semester fee.'},
  {title:'Ambiguous meeting', date:'soon', category:'College event'},
] } }
const lookup = name => ({ item: prepared, all: () => [{ json: validated.json }] })
const validated = run('validate-extraction.js', extraction, lookup)
assert.equal(validated.json.notice.priority, 'High')
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
console.log('n8n preparation, validation, and workflow structure pass')
