// n8n Code node: Run Once for Each Item.
const status = Number($json.statusCode);
if (![200, 201, 409].includes(status)) {
  const detail = $json.body?.error?.message || $json.body?.message || 'Unknown Google Calendar error';
  throw new Error('Calendar creation failed (' + status + '): ' + detail);
}
const approved = $('Build Calendar Payload').item.json;
return { json: {
  id: approved.id,
  google_calendar_event_id: approved.calendarEventId,
  updated_at: new Date().toISOString(),
} };
