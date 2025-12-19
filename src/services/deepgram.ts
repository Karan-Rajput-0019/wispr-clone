export type DeepgramTestResult =
  | { ok: true }
  | { ok: false; error: string }

export async function testDeepgramConnection(
  apiKey: string,
  language: string
): Promise<DeepgramTestResult> {
  const key = apiKey.trim()
  if (!key) return { ok: false, error: 'Missing API key' }

  const wsUrl =
    `wss://api.deepgram.com/v1/listen?model=nova-2` +
    `&language=${encodeURIComponent(language)}` +
    `&punctuate=true&smart_format=true&interim_results=false`

  return await new Promise((resolve) => {
    let done = false

    const finish = (r: DeepgramTestResult) => {
      if (done) return
      done = true
      resolve(r)
    }

    const timeout = setTimeout(() => {
      finish({ ok: false, error: 'Timed out connecting to Deepgram' })
    }, 3500)

    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl, ['token', key])

      ws.onopen = () => {
        clearTimeout(timeout)
        try {
          ws?.close()
        } catch {}
        finish({ ok: true })
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        finish({ ok: false, error: 'WebSocket error (check key / network)' })
      }

      ws.onclose = () => {
        // If it closes before open, treat it as failure.
        // (onopen would have already resolved.)
        if (!done) {
          clearTimeout(timeout)
          finish({ ok: false, error: 'Connection closed before ready' })
        }
      }
    } catch (e) {
      clearTimeout(timeout)
      finish({ ok: false, error: e instanceof Error ? e.message : 'Failed to connect' })
    }
  })
}

export async function testMicrophone(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Microphone permission denied' }
  }
}
