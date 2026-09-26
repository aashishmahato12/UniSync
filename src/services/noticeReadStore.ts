const storageKey = (email: string) => `unisync:read-notices:v2:${email.trim().toLowerCase()}`

export function loadReadNoticeIds(email: string): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(email)) || '[]')
    return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveReadNoticeIds(email: string, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify([...ids]))
  } catch {
    // Reading mail still works when browser storage is unavailable.
  }
}
