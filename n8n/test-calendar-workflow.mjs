import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const payloadSource = readFileSync(join(dir, 'build-calendar-payload.js'), 'utf8')
const resultSource = readFileSync(join(dir, 'check-calendar-result.js'), 'utf8')
const build = new Function('$input', payloadSource)
const check = new Function('$json', '$', resultSource)
const id = 'f565120e-2fa1-46ab-9a41-d4cc942ef42d'

const allDay = build({ all: () => [{ json: {
  id, title: 'Exam deadline', event_date: '2026-09-30',
  start_time: null, end_time: null, description: 'Submit form'
} }] })[0].json
assert.equal(allDay.calendarEventId, 'uni' + id.replaceAll('-', ''))
assert.match(allDay.calendarEventId, /^[a-v0-9]{5,1024}$/)
assert.deepEqual(allDay.calendarEvent.start, { date: '2026-09-30' })
assert.deepEqual(allDay.calendarEvent.end, { date: '2026-10-01' })

const timed = build({ all: () => [{ json: {
  id, title: 'Practical', event_date: '2026-09-17',
  start_time: '09:00:00', end_time: '10:30:00', location: 'Lab'
} }] })[0].json
assert.equal(timed.calendarEvent.start.dateTime, '2026-09-17T03:15:00.000Z')
assert.equal(timed.calendarEvent.end.dateTime, '2026-09-17T04:45:00.000Z')
assert.equal(timed.calendarEvent.location, 'Lab')

const lookup = () => ({ item: { json: timed } })
assert.equal(check({ statusCode: 201 }, lookup).json.google_calendar_event_id, timed.calendarEventId)
assert.equal(check({ statusCode: 409 }, lookup).json.google_calendar_event_id, timed.calendarEventId)
assert.throws(() => check({ statusCode: 401, body: { error: { message: 'Unauthorized' } } }, lookup), /Unauthorized/)
assert.throws(() => build({ all: () => [{ json: { id: 'bad', event_date: '2026-09-17' } }] }), /invalid ID/)

const workflow = JSON.parse(readFileSync(join(dir, 'approved-events-to-google-calendar.json'), 'utf8'))
assert.equal(workflow.active, false)
assert.equal(workflow.nodes.length, 6)
assert.equal(workflow.nodes.find(node => node.name === 'Create Google Calendar Event').parameters.nodeCredentialType, 'googleCalendarOAuth2Api')
console.log('Calendar workflow checks passed')
