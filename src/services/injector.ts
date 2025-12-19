import { invoke } from '@tauri-apps/api/tauri'

export async function injectText(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

  try {
    await invoke('inject_text', { text: trimmed })
  } catch (e) {
    console.warn('inject_text failed, falling back to clipboard', e)
    try {
      await navigator.clipboard.writeText(trimmed)
    } catch (err) {
      console.error('Clipboard fallback failed', err)
      throw err
    }
  }
}
    