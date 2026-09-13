// n8n Code node: Run Once for Each Item
const message = $json;

function decodeBase64Url(value) {
  if (!value) return '';
  try { return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
  catch { return ''; }
}

function collect(part, output = { plain: [], html: [], attachments: [] }) {
  if (!part) return output;
  if (part.filename) output.attachments.push(part.filename);
  const decoded = decodeBase64Url(part.body?.data);
  if (decoded && part.mimeType === 'text/plain') output.plain.push(decoded);
  if (decoded && part.mimeType === 'text/html') output.html.push(decoded);
  for (const child of part.parts || []) collect(child, output);
  return output;
}

const contents = collect(message.payload);
const stripHtml = html => html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const headers = Object.fromEntries((message.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value]));
const subject = message.subject || headers.subject || '(No subject)';
const sender = message.from || headers.from || '';
const body = (message.textPlain || contents.plain.join('\n') || stripHtml(message.textHtml || contents.html.join('\n')) || message.snippet || '').slice(0, 20000);
const id = message.id || '';
if (!id || !body.trim()) throw new Error('Email ID or body missing. Check Gmail Get Message settings.');
const received = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : (headers.date ? new Date(headers.date).toISOString() : null);

return { json: {
  gmail_message_id: id,
  gmail_thread_id: message.threadId || null,
  subject,
  sender,
  received_at: received,
  attachment_names: [...new Set(contents.attachments)],
  source_url: `https://mail.google.com/mail/u/0/#all/${id}`,
  ai_input: `Today's date: ${new Date().toISOString().slice(0,10)}. Time zone: Asia/Kathmandu.\nSender: ${sender}\nSubject: ${subject}\nReceived: ${received || 'unknown'}\n\n${body}`,
} };
