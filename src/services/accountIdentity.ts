// Used only for the original student's display name and to protect the shared
// test Gmail from sending college mail through a different UniSync account.
export const connectedMailboxEmail = 'mahatoaashish5@gmail.com'

export const hasConnectedMailbox = (email: string) =>
  email.trim().toLowerCase() === connectedMailboxEmail

export const accountName = (email: string) => {
  if (hasConnectedMailbox(email)) return 'Aashish Mahato'
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return local ? local.replace(/\b\w/g, letter => letter.toUpperCase()) : 'Student account'
}

export const accountInitials = (email: string) => {
  if (hasConnectedMailbox(email)) return 'AM'
  const words = accountName(email).split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
}
