import type { Notice } from '../data'

export function gmailUrlForNotice(notice: Notice): string | undefined {
  if (notice.sourceUrl) {
    try {
      const url = new URL(notice.sourceUrl)
      if (url.protocol === 'https:' && url.hostname === 'mail.google.com' && url.pathname.startsWith('/mail/')) {
        return url.toString()
      }
    } catch {
      // Older records can still use their Gmail message ID below.
    }
  }

  return notice.gmailMessageId && /^[a-zA-Z0-9_-]{8,100}$/.test(notice.gmailMessageId)
    ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(notice.gmailMessageId)}`
    : undefined
}
