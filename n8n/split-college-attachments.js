// Run once for all items after Gmail Get with Download Attachments enabled.
const output = [];
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
for (const [itemIndex, item] of $input.all().entries()) {
  const message = item.json;
  const from = message.from || message.headers?.from || '';
  const sender = typeof from === 'string' ? from : (from.text || from.value?.[0]?.address || '');
  const address = (typeof from === 'object' && from.value?.[0]?.address
    ? from.value[0].address : (/<([^<>]+)>/.exec(sender)?.[1] || sender))
    .trim().toLowerCase();
  if (!/^[^\s@<>]+@heraldcollege\.edu\.np$/.test(address)) {
    throw new Error('Attachment sender is outside the Herald College domain.');
  }
  const messageId = String(message.id || '');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(messageId)) {
    throw new Error('Invalid Gmail message ID.');
  }
  const subject = String(message.subject || message.headers?.subject || '(No subject)').slice(0, 200);
  const rawDate = message.date || message.internalDate || null;
  const dateValue = /^\d{12,}$/.test(String(rawDate || '')) ? Number(rawDate) : rawDate;
  const received = dateValue && !Number.isNaN(new Date(dateValue).getTime())
    ? new Date(dateValue).toISOString() : null;
  for (const [property, file] of Object.entries(item.binary || {})) {
    const mime = String(file.mimeType || '').toLowerCase();
    if (!allowed.has(mime)) continue;
    const index = Number(/(\d+)$/.exec(property)?.[1] ?? output.length);
    if (!Number.isInteger(index) || index < 0 || index > 49) continue;
    const name = String(file.fileName || 'attachment')
      .replace(/[\/\\:<>"|?*\x00-\x1f]/g, '_').slice(0, 180);
    const sizeMatch = /^(\d+(?:\.\d+)?)\s*(B|KB|MB)?$/i.exec(String(file.fileSize || ''));
    const multiplier = sizeMatch?.[2]?.toUpperCase() === 'MB' ? 1048576
      : sizeMatch?.[2]?.toUpperCase() === 'KB' ? 1024 : 1;
    const sizeBytes = sizeMatch ? Math.round(Number(sizeMatch[1]) * multiplier) : null;
    if (sizeBytes !== null && (sizeBytes <= 0 || sizeBytes > 10485760)) continue;
    const storagePath = `${messageId}/${index}-${name}`;
    output.push({
      json: {
        gmail_message_id: messageId,
        attachment_index: index,
        file_name: name,
        mime_type: mime,
        size_bytes: sizeBytes,
        storage_path: storagePath,
        sender,
        subject,
        received_at: received,
      },
      binary: { data: file },
      pairedItem: { item: itemIndex },
    });
  }
}
return output;
