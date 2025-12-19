// Minimal Deepgram live-streaming client using WebSocket

import { getDeepgramApiKey } from './settings'

let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let socket: WebSocket | null = null

let finalTranscript = ''
let partialTranscript = ''

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]

  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t
    }
  }

  return undefined
}

function currentDisplayTranscript(): string {
  const f = finalTranscript.trim()
  const p = partialTranscript.trim()
  if (!f) return p
  if (!p) return f
  return `${f} ${p}`
}

export async function startDictation(
  language: string,
  onTranscript: (text: string) => void,
  onError: (err: string) => void,
) {
  try {
    const apiKey = getDeepgramApiKey()
    if (!apiKey) {
      throw new Error(
        'Missing Deepgram API key. Add VITE_DEEPGRAM_API_KEY in a root .env, or set it in Settings.'
      )
    }

    // Reset session state
    finalTranscript = ''
    partialTranscript = ''
    onTranscript('')

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const wsUrl =
      `wss://api.deepgram.com/v1/listen?model=nova-2` +
      `&language=${encodeURIComponent(language)}` +
      `&punctuate=true&smart_format=true&interim_results=true`

    socket = new WebSocket(wsUrl, ['token', apiKey])

    socket.onopen = () => {
      const mimeType = pickRecorderMimeType()
      mediaRecorder = new MediaRecorder(mediaStream as MediaStream, {
        ...(mimeType ? { mimeType } : {}),
      })

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      })

      // Send chunks frequently to keep latency down.
      mediaRecorder.start(250)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        const transcript: string =
          data?.channel?.alternatives?.[0]?.transcript ?? ''

        if (!transcript) return

        if (data.is_final) {
          finalTranscript = (finalTranscript + ' ' + transcript).trim()
          partialTranscript = ''
        } else {
          partialTranscript = transcript
        }

        onTranscript(currentDisplayTranscript())
      } catch (e) {
        console.error('Error parsing Deepgram message', e)
      }
    }

    socket.onerror = (ev) => {
      console.error('Deepgram WebSocket error', ev)
      onError('Deepgram WebSocket error')
    }

    socket.onclose = () => {
      // Normal on stop.
      console.log('Deepgram WebSocket closed')
    }
  } catch (e) {
    console.error('startDictation error', e)
    onError(e instanceof Error ? e.message : 'Failed to start dictation')
  }
}

export async function stopDictation(): Promise<string> {
  const socketToClose = socket

  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  } catch {}

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }

  mediaRecorder = null
  socket = null

  const finalTextNow = finalTranscript.trim()

  if (!socketToClose) {
    return finalTextNow
  }

  // Give Deepgram a moment to flush the last final results.
  return await new Promise((resolve) => {
    const timeoutMs = 1500
    const timer = setTimeout(() => {
      try {
        if (
          socketToClose.readyState === WebSocket.OPEN ||
          socketToClose.readyState === WebSocket.CONNECTING
        ) {
          socketToClose.close()
        }
      } catch {}
      resolve(finalTranscript.trim())
    }, timeoutMs)

    const prevOnClose = socketToClose.onclose
    socketToClose.onclose = (ev) => {
      try {
        if (typeof prevOnClose === 'function') prevOnClose.call(socketToClose, ev)
      } finally {
        clearTimeout(timer)
        resolve(finalTranscript.trim())
      }
    }

    try {
      if (
        socketToClose.readyState === WebSocket.OPEN ||
        socketToClose.readyState === WebSocket.CONNECTING
      ) {
        socketToClose.close()
      } else {
        clearTimeout(timer)
        resolve(finalTranscript.trim())
      }
    } catch {
      clearTimeout(timer)
      resolve(finalTranscript.trim())
    }
  })
}
