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
const downloadedNames = Object.values($input.item.binary || {})
  .map(file => String(file.fileName || '').trim()).filter(Boolean);
const stripHtml = html => html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const headerSource = message.payload?.headers || message.headers || [];
const headers = Array.isArray(headerSource)
  ? Object.fromEntries(headerSource.map(h => [String(h.name).toLowerCase(), h.value]))
  : Object.fromEntries(Object.entries(headerSource).map(([name, value]) => [name.toLowerCase(), value]));
const subject = message.subject || message.Subject || headers.subject || '(No subject)';
const from = message.from || message.From || headers.from || '';
const sender = typeof from === 'string' ? from : (from.text || from.value?.[0]?.address || '');
const senderAddress = (typeof from === 'object' && from.value?.[0]?.address
  ? from.value[0].address
  : (/<([^<>]+)>/.exec(sender)?.[1] || sender)).trim().toLowerCase();
if (!/^[^\s@<>]+@heraldcollege\.edu\.np$/.test(senderAddress)) throw new Error('Email sender is outside the Herald College domain.');
const plain = message.textPlain || message.text || contents.plain.join('\n');
const html = message.textHtml || message.html || contents.html.join('\n');
const body = String(plain || stripHtml(String(html || '')) || message.snippet || '').slice(0, 20000);
const id = message.id || '';
if (!id || (!body.trim() && !downloadedNames.length && !contents.attachments.length))
  throw new Error('Email ID or notice content missing. Check Gmail Get Message settings.');
const rawDate = message.internalDate ? Number(message.internalDate) : (message.date || headers.date);
const dateValue = typeof rawDate === 'number' && rawDate < 100000000000 ? rawDate * 1000 : rawDate;
const parsedDate = dateValue ? new Date(dateValue) : null;
const received = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;

return { json: {
  gmail_message_id: id,
  gmail_thread_id: message.threadId || null,
  subject,
  sender,
  received_at: received,
  attachment_names: [...new Set([...contents.attachments, ...downloadedNames])],
  attachment_only: !body.trim(),
  body_text: body.trim() || null,
  source_url: `https://mail.google.com/mail/u/0/#all/${id}`,
  ai_input: `Today's date: ${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}. Time zone: Asia/Kathmandu.\nSender: ${sender}\nSubject: ${subject}\nReceived: ${received || 'unknown'}\nAttachments: ${[...new Set([...contents.attachments, ...downloadedNames])].join(', ') || 'none'}\n\n${body || 'The email has no body; the notice is in an attachment. Do not invent its contents or dates.'}`,
} };
