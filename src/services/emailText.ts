const replyHeader = /^On\s.+wrote:\s*$/i

export function cleanEmailForReading(value?: string) {
  if (!value) return ''

  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const cleaned: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    // Gmail prefixes text from an earlier message with >. The separate
    // header immediately above that block is also hidden from the reader.
    if (trimmed.startsWith('>')) continue
    if (replyHeader.test(trimmed) || (/^On\s.+/i.test(trimmed) && /^wrote:\s*$/i.test(lines[index + 1]?.trim() ?? ''))) {
      const next = lines[index + 1]?.trim()
      if (/^wrote:\s*$/i.test(next)) index += 1
      continue
    }
    if (/^wrote:\s*$/i.test(trimmed) && lines[index + 1]?.trim().startsWith('>')) continue

    cleaned.push(line.replace(/^\s*>\s?/, ''))
  }

  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
