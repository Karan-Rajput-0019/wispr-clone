export type HistoryItem = {
  id: string
  text: string
  createdAt: number
}

const STORAGE_KEY = 'wispr.history.v1'
const MAX_ITEMS = 25

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.id === 'string' &&
          typeof x.text === 'string' &&
          typeof x.createdAt === 'number'
      )
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // ignore
  }
}

export function addToHistory(text: string): HistoryItem[] {
  const trimmed = text.trim()
  if (!trimmed) return loadHistory()

  const current = loadHistory()
  const next: HistoryItem[] = [
    {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      text: trimmed,
      createdAt: Date.now(),
    },
    ...current,
  ]

  saveHistory(next)
  return next
}
