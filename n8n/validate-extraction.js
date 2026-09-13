// n8n Code node: Run Once for Each Item
const source = $('Prepare Email').item.json;
const raw = $json.output || $json;
const allowedCategory = ['Payments','Exams','Academics','Campus life','General'];
const allowedEventCategory = ['Exam','Deadline','College event','Holiday'];
const summary = String(raw.summary || '').trim().slice(0, 1200);
if (!summary) throw new Error('AI returned no summary. Review the extractor output.');
const events = (Array.isArray(raw.events) ? raw.events : []).slice(0, 10)
  .map((event, index) => ({
    event_key: `${source.gmail_message_id}:${index}`,
    gmail_message_id: source.gmail_message_id,
    title: String(event.title || '').trim().slice(0, 200),
    event_date: String(event.date || '').slice(0, 10),
    start_time: /^\d{2}:\d{2}$/.test(event.start_time || '') ? event.start_time : null,
    end_time: /^\d{2}:\d{2}$/.test(event.end_time || '') ? event.end_time : null,
    location: event.location ? String(event.location).slice(0, 200) : null,
    category: allowedEventCategory.includes(event.category) ? event.category : 'College event',
    description: String(event.description || '').slice(0, 1000),
    calendar_state: 'Pending',
  }))
  .filter(event => event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.event_date) && !Number.isNaN(Date.parse(`${event.event_date}T00:00:00Z`)));

return { json: {
  notice: {
    gmail_message_id: source.gmail_message_id,
    gmail_thread_id: source.gmail_thread_id,
    subject: source.subject,
    sender: source.sender,
    received_at: source.received_at,
    summary,
    category: allowedCategory.includes(raw.category) ? raw.category : 'General',
    priority: raw.priority === 'High' ? 'High' : 'Normal',
    attachment_names: source.attachment_names,
    source_url: source.source_url,
  },
  events,
} };
