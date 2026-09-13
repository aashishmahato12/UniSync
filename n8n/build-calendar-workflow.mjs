import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const code = name => readFileSync(join(dir, name), 'utf8')
const node = (id, name, type, typeVersion, position, parameters) => ({ id, name, type, typeVersion, position, parameters })
const link = (name, next) => ({ [name]: { main: [[{ node: next, type: 'main', index: 0 }]] } })
const base = 'https://qozetqmklegcnjgxtgpd.supabase.co/rest/v1/college_events'

const workflow = {
  name: 'UniSync — approved events to Google Calendar',
  nodes: [
    node('67331054-bfda-47f8-a94d-73b5c4578b93', 'Check Approved Events', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 0], {
      rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] },
    }),
    node('a4803b6d-f055-42d5-996c-dbe71ffdd8b8', 'List Approved Events', 'n8n-nodes-base.httpRequest', 4.2, [230, 0], {
      method: 'GET',
      url: base + '?select=id,title,event_date,start_time,end_time,location,description&calendar_state=eq.Added&google_calendar_event_id=is.null&order=event_date.asc&limit=50',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 15000 },
    }),
    node('3d49e6de-89fb-47e1-9b53-8b3e0aaefc93', 'Build Calendar Payload', 'n8n-nodes-base.code', 2, [460, 0], {
      mode: 'runOnceForAllItems',
      jsCode: code('build-calendar-payload.js'),
    }),
    node('2209d9b4-f639-4489-99a7-4db197526aad', 'Create Google Calendar Event', 'n8n-nodes-base.httpRequest', 4.2, [690, 0], {
      method: 'POST',
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleCalendarOAuth2Api',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ $json.calendarEvent }}',
      options: { timeout: 15000, response: { response: { fullResponse: true, neverError: true } } },
    }),
    node('57a81b41-aa3b-430a-bc10-734580a4cbef', 'Check Calendar Result', 'n8n-nodes-base.code', 2, [920, 0], {
      mode: 'runOnceForEachItem',
      jsCode: code('check-calendar-result.js'),
    }),
    node('79cd2779-3b21-4185-a936-5d7d468d4bf2', 'Save Google Event ID', 'n8n-nodes-base.httpRequest', 4.2, [1150, 0], {
      method: 'PATCH',
      url: '={{ "' + base + '?id=eq." + encodeURIComponent($json.id) + "&calendar_state=eq.Added&google_calendar_event_id=is.null" }}',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' },
      ] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ { google_calendar_event_id: $json.google_calendar_event_id, updated_at: $json.updated_at } }}',
      options: { timeout: 15000 },
    }),
  ],
  connections: {
    ...link('Check Approved Events', 'List Approved Events'),
    ...link('List Approved Events', 'Build Calendar Payload'),
    ...link('Build Calendar Payload', 'Create Google Calendar Event'),
    ...link('Create Google Calendar Event', 'Check Calendar Result'),
    ...link('Check Calendar Result', 'Save Google Event ID'),
  },
  pinData: {},
  settings: { executionOrder: 'v1', timezone: 'Asia/Kathmandu' },
  active: false,
  tags: [],
}

writeFileSync(join(dir, 'approved-events-to-google-calendar.json'), JSON.stringify(workflow, null, 2) + '\n')
