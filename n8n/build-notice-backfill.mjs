import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const intake = JSON.parse(readFileSync(join(dir, 'heritage-gmail-to-supabase.json'), 'utf8'))
const gmailTrigger = intake.nodes.find(node => node.name === 'Gmail Trigger')
const fullEmail = intake.nodes.find(node => node.name === 'Get Full Email')
if (!gmailTrigger || !fullEmail) throw new Error('The Herald Gmail intake workflow is incomplete.')

const search = gmailTrigger.parameters.filters.q
const backfill = {
  ...intake,
  name: 'Herald College — backfill all Gmail notices (manual)',
  nodes: [
    {
      
      id: 'f3c172b8-f8c2-4a7d-b104-f3066ad28a90',
      name: 'Manual Backfill',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [-440, 0],
      parameters: {},
    },
    {
      id: '8ed4a8d6-b345-46c6-8cc5-29b207d5c66a',
      name: 'Get All Herald Emails',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [-220, 0],
      parameters: {
        resource: 'message',
        operation: 'getAll',
        returnAll: true,
        simple: true,
        filters: { q: search },
        options: {},
      },
    },
    ...intake.nodes.filter(node => node.name !== 'Gmail Trigger').map(node =>
      node.name === 'Get Full Email'
        ? { ...node, parameters: { ...node.parameters, options: { ...node.parameters.options, downloadAttachments: false } } }
        : node
    ),
  ],
  connections: {
    ...Object.fromEntries(Object.entries(intake.connections).filter(([name]) => name !== 'Gmail Trigger')),
    'Manual Backfill': { main: [[{ node: 'Get All Herald Emails', type: 'main', index: 0 }]] },
    'Get All Herald Emails': { main: [[{ node: 'Get Full Email', type: 'main', index: 0 }]] },
  },
  pinData: {},
  active: false,
  tags: [],
}

writeFileSync(join(dir, 'herald-all-notices-backfill.json'), JSON.stringify(backfill, null, 2) + '\n')
