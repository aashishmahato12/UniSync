// n8n Code node: Run Once for All Items.
const rows = $input.all().flatMap(item => Array.isArray(item.json) ? item.json : [item.json]);
const zone = 'Asia/Kathmandu';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}/;

return rows.map(row => {
  if (!/^[0-9a-f-]{36}$/i.test(String(row.id || '')) || !datePattern.test(String(row.event_date || ''))) {
    throw new Error('Approved event has an invalid ID or date.');
  }
  const id = 'uni' + row.id.replace(/-/g, '').toLowerCase();
  const startTime = timePattern.test(String(row.start_time || '')) ? String(row.start_time).slice(0, 8) : null;
  let start;
  let end;
  if (startTime) {
    const beginning = new Date(row.event_date + 'T' + startTime + '+05:45');
    if (Number.isNaN(beginning.getTime())) throw new Error('Invalid event start time.');
    const rawEnd = timePattern.test(String(row.end_time || '')) ? String(row.end_time).slice(0, 8) : null;
    const explicitEnd = rawEnd ? new Date(row.event_date + 'T' + rawEnd + '+05:45') : null;
    const ending = explicitEnd && explicitEnd > beginning ? explicitEnd : new Date(beginning.getTime() + 60 * 60 * 1000);
    start = { dateTime: beginning.toISOString(), timeZone: zone };
    end = { dateTime: ending.toISOString(), timeZone: zone };
  } else {
    const next = new Date(row.event_date + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    start = { date: row.event_date };
    end = { date: next.toISOString().slice(0, 10) };
  }
  const calendarEvent = {
    id,
    summary: String(row.title || 'College event').slice(0, 200),
    description: [String(row.description || '').trim(), 'Approved in UniSync'].filter(Boolean).join('\n\n'),
    location: row.location || undefined,
    start,
    end,
  };
  return { json: { id: row.id, calendarEventId: id, calendarEvent } };
});

