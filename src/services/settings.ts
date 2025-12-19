export type Settings = {
  deepgramApiKey?: string
}

const KEY = 'wispr.settings.v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    const apiKey =
      typeof (parsed as any).deepgramApiKey === 'string'
        ? String((parsed as any).deepgramApiKey)
        : undefined

    return { deepgramApiKey: apiKey?.trim() || undefined }
  } catch {
    return {}
  }
}

export function saveSettings(next: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function getDeepgramApiKey(): string | undefined {
  // Prefer build-time env var if present.
  const envKey = (import.meta as any).env?.VITE_DEEPGRAM_API_KEY
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim()
  }

  return loadSettings().deepgramApiKey
}

export function setDeepgramApiKey(key: string): Settings {
  const trimmed = key.trim()
  const next: Settings = {
    deepgramApiKey: trimmed.length > 0 ? trimmed : undefined,
  }
  saveSettings(next)
  return next
}
