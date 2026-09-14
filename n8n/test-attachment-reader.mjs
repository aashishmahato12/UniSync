import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const workflow = JSON.parse(readFileSync(join(dir, 'herald-read-attachments.json'), 'utf8'))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
assert(workflow.active === false, 'Reader must start inactive')
assert(workflow.nodes.filter(node => node.type === '@n8n/n8n-nodes-langchain.googleGemini').length === 2, 'PDF and image readers required')
for (const node of workflow.nodes.filter(node => node.type === 'n8n-nodes-base.code')) {
  const run = new Function('$json', '$', node.parameters.jsCode)
  const record = () => ({ item: { json: { id: 'attachment-id' } } })
  const ready = run({ content: { parts: [{ text: 'Exam on 20 Sep' }] } }, record).json
  assert(ready.id === 'attachment-id' && ready.extraction_status === 'Ready' && ready.extracted_text.includes('20 Sep'), `${node.name} lost readable text`)
  const empty = run({ text: 'NO_READABLE_TEXT' }, record).json
  assert(empty.extraction_status === 'No text' && empty.extracted_text === null, `${node.name} did not mark an unreadable file`)
}
assert(workflow.nodes.every(node => !JSON.stringify(node).includes('service_role')), 'Workflow must not embed a secret')
console.log('Attachment reader structure and text handling passed')
