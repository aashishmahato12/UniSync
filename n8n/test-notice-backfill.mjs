import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const workflow = JSON.parse(readFileSync(join(dir, 'herald-all-notices-backfill.json'), 'utf8'))
const nodes = new Map(workflow.nodes.map(node => [node.name, node]))
assert.equal(workflow.active, false)
assert.equal(nodes.has('Gmail Trigger'), false)
assert.equal(nodes.get('Get All Herald Emails').parameters.returnAll, true)
assert.equal(nodes.get('Get All Herald Emails').parameters.filters.q, 'from:(@heraldcollege.edu.np)')
assert.equal(nodes.get('Get Full Email').parameters.options.downloadAttachments, false)
assert.equal(nodes.get('Save Notice').parameters.url.includes('on_conflict=gmail_message_id'), true)
for (const [name, connection] of Object.entries(workflow.connections)) {
  assert(nodes.has(name))
  for (const groups of Object.values(connection)) {
    for (const group of groups) for (const edge of group) assert(nodes.has(edge.node))
  }
}
assert.equal(JSON.stringify(workflow).includes('credentials'), false)
console.log('Manual all-notices backfill structure passes')
