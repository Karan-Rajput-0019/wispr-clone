// Minimal Deepgram live-streaming client using WebSocket
// Deepgram live docs: wss://api.deepgram.com/v1/listen with 'token' subprotocol.[web:32][web:77]

const DEEPGRAM_API_KEY = (import.meta as any).env
  .VITE_DEEPGRAM_API_KEY as string

let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let socket: WebSocket | null = null

export async function startDictation(
  language: string,
  onTranscript: (text: string) => void,
  onError: (err: string) => void,
) {
  try {
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Missing Deepgram API key (VITE_DEEPGRAM_API_KEY)')
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=nova-2&language=${language}`,
      ['token', DEEPGRAM_API_KEY],
    )

    socket.onopen = () => {
      mediaRecorder = new MediaRecorder(mediaStream as MediaStream)

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      })

      // Send chunks every 250ms as suggested in Deepgram live examples.[web:32]
      mediaRecorder.start(250)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        const transcript =
          data?.channel?.alternatives?.[0]?.transcript ?? ''

        if (transcript && data.is_final) {
          onTranscript(transcript)
        }
      } catch (e) {
        console.error('Error parsing Deepgram message', e)
      }
    }

    socket.onerror = (ev) => {
      console.error('Deepgram WebSocket error', ev)
      onError('Deepgram WebSocket error')
    }

    socket.onclose = () => {
      console.log('Deepgram WebSocket closed')
    }
  } catch (e) {
    console.error('startDictation error', e)
    onError(e instanceof Error ? e.message : 'Failed to start dictation')
  }
}

export async function stopDictation(): Promise<string> {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  } catch {}

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close()
  }

  mediaRecorder = null
  socket = null

  // Let caller use the last transcript it already has
  return ''
}
