import { useEffect, useMemo, useRef, useState } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { startDictation, stopDictation } from './services/audio'
import { injectText } from './services/injector'
import { addToHistory, loadHistory, type HistoryItem } from './services/history'
import { playStartSound, playStopSound } from './services/sound'
import { getDeepgramApiKey, loadSettings, setDeepgramApiKey } from './services/settings'
import './App.css'

type RecordingStatus = 'idle' | 'starting' | 'recording' | 'stopping'

type WisprUpdate = {
  status: RecordingStatus
  transcript: string
  error: string | null
}

const isOverlayMode = new URLSearchParams(window.location.search).get('overlay') === '1'

if (isOverlayMode) {
  document.body.classList.add('isOverlay')
}

function OverlayApp() {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isActive = status === 'starting' || status === 'recording' || status === 'stopping'

  useEffect(() => {
    let unlisten: null | (() => void) = null

    listen<WisprUpdate>('wispr:update', (e) => {
      setStatus(e.payload.status)
      setTranscript(e.payload.transcript)
      setError(e.payload.error)
    })
      .then((fn) => (unlisten = fn))
      .catch((err) => console.warn('overlay listen wispr:update failed', err))

    return () => {
      try {
        unlisten?.()
      } catch {}
    }
  }, [])

  // Auto-hide when inactive.
  useEffect(() => {
    if (!isActive) {
      // Hide after a short delay so users can see the final result flash.
      const t = setTimeout(() => {
        void appWindow.hide()
      }, 650)
      return () => clearTimeout(t)
    }
  }, [isActive])

  const toggleFromOverlay = async () => {
    try {
      // JS-side emit triggers the backend event module which broadcasts to windows.
      await emit('toggle-recording')
    } catch (e) {
      console.warn('overlay toggle failed', e)
    }
  }

  return (
    <div className="overlayRoot">
      <div className={isActive ? 'overlayBar active' : 'overlayBar'}>
        <div className={isActive ? 'dot on' : 'dot'} />
        <div className="overlayText" title={transcript}>
          {error ? `Error: ${error}` : transcript || 'Ctrl+Shift+Space to dictate…'}
        </div>
        <button className="overlayBtn" onClick={toggleFromOverlay}>
          {status === 'recording' || status === 'starting' ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  )
}

function MainApp() {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('en')
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory())
  const [toast, setToast] = useState<string | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(() => loadSettings().deepgramApiKey ?? '')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  const isRecording = status === 'starting' || status === 'recording'

  const statusRef = useRef(status)
  const transcriptRef = useRef(transcript)
  const errorRef = useRef<string | null>(error)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    errorRef.current = error
  }, [error])

  const broadcast = async (next: Partial<WisprUpdate> = {}) => {
    try {
      await emit('wispr:update', {
        status: next.status ?? statusRef.current,
        transcript: next.transcript ?? transcriptRef.current,
        error: next.error ?? errorRef.current,
      } satisfies WisprUpdate)
    } catch {
      // ignore
    }
  }

  // Keep overlay in sync even on first load.
  useEffect(() => {
    void broadcast({ status, transcript, error })
  }, [])

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const setErrorAndBroadcast = (msg: string | null) => {
    setError(msg)
    void broadcast({ error: msg })
  }

  const setTranscriptAndBroadcast = (text: string) => {
    setTranscript(text)
    void broadcast({ transcript: text })
  }

  const ensureApiKey = (): boolean => {
    const key = getDeepgramApiKey()
    if (key && key.trim().length > 0) return true

    setToast('Add your Deepgram API key in Settings to start dictation')
    setSettingsOpen(true)

    // If main window is hidden (tray mode), bring it back so the user can paste the key.
    void appWindow.show()
    void appWindow.setFocus()

    return false
  }

  const handleStart = async () => {
    if (statusRef.current !== 'idle') return
    if (!ensureApiKey()) return

    try {
      setErrorAndBroadcast(null)
      setTranscriptAndBroadcast('')
      setStatus('starting')
      void broadcast({ status: 'starting' })
      void playStartSound()

      await startDictation(
        language,
        (text) => setTranscriptAndBroadcast(text),
        (err) => {
          setErrorAndBroadcast(err)
          setStatus('idle')
          void broadcast({ status: 'idle' })
        }
      )

      // startDictation returns after wiring WebSocket/recorder.
      setStatus('recording')
      void broadcast({ status: 'recording' })
    } catch (e) {
      setErrorAndBroadcast(String(e))
      setStatus('idle')
      void broadcast({ status: 'idle' })
    }
  }

  const handleStop = async () => {
    if (statusRef.current !== 'recording' && statusRef.current !== 'starting') return

    try {
      setStatus('stopping')
      void broadcast({ status: 'stopping' })
      void playStopSound()

      const finalText = await stopDictation()
      const textToInject = (finalText || transcriptRef.current).trim()

      if (textToInject.length > 0) {
        setHistory(addToHistory(textToInject))
        await injectText(textToInject)
        setToast('Injected')
      } else {
        setToast('No speech detected')
      }

      setStatus('idle')
      void broadcast({ status: 'idle', transcript: '' })
      setTranscript('')
    } catch (e) {
      setErrorAndBroadcast(String(e))
      setStatus('idle')
      void broadcast({ status: 'idle' })
    }
  }

  const toggleRecording = () => {
    if (statusRef.current === 'idle') {
      void handleStart()
    } else if (statusRef.current === 'recording' || statusRef.current === 'starting') {
      void handleStop()
    }
  }

  const reinject = async (text: string) => {
    try {
      await injectText(text)
      setToast('Injected')
    } catch (e) {
      setToast('Inject failed (copied instead)')
      console.warn(e)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast('Copied')
    } catch (e) {
      console.warn(e)
      setToast('Copy failed')
    }
  }

  // Listen for global shortcut / tray toggle.
  useEffect(() => {
    let unlisten: null | (() => void) = null

    listen('toggle-recording', () => {
      toggleRecording()
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch((e) => {
        console.warn('Failed to listen for toggle-recording event', e)
      })

    return () => {
      try {
        unlisten?.()
      } catch {}
    }
  }, [])

  const hotkeyHint = useMemo(() => 'Ctrl+Shift+Space', [])

  useEffect(() => {
    // If no key is set, prompt settings on first load.
    if (!getDeepgramApiKey()) {
      setSettingsOpen(true)
    }
  }, [])

  const saveKey = () => {
    setDeepgramApiKey(apiKeyInput)
    if (getDeepgramApiKey()) {
      setToast('API key saved')
      setSettingsOpen(false)
      setErrorAndBroadcast(null)
    } else {
      setToast('Invalid API key')
    }
  }

  return (
    <div className="app">
      <header className="topBar">
        <div>
          <h1>Wispr Flow Clone</h1>
          <div className="subtle">Hotkey: <code>{hotkeyHint}</code></div>
        </div>

        <div className="topBarActions">
          <button className="chip" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {!getDeepgramApiKey() && (
        <div className="banner">
          <div>
            <strong>Deepgram key required.</strong> Add it in Settings to enable speech-to-text.
          </div>
          <button className="miniBtn" onClick={() => setSettingsOpen(true)}>
            Open Settings
          </button>
        </div>
      )}

      <div className="controls">
        <label>
          Language:&nbsp;
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </label>

        <button className={isRecording ? 'btn stop' : 'btn start'} onClick={toggleRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        <button className="btn secondary" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>

        <button className="btn secondary" onClick={() => void appWindow.hide()}>
          Hide
        </button>
      </div>

      {settingsOpen && (
        <div className="modalBackdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">Deepgram API Key</div>
                <div className="modalSubtitle">
                  Stored locally (localStorage). Not committed to git.
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSettingsOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="field">
              <label>Key</label>
              <div className="fieldRow">
                <input
                  className="input"
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Deepgram key"
                  autoFocus
                />
                <button className="miniBtn" onClick={() => setApiKeyVisible((v) => !v)}>
                  {apiKeyVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button className="btn start" onClick={saveKey}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="panel">
        <h2>Live Transcript</h2>
        <p className="transcript">{transcript || `Press “Start Recording” or ${hotkeyHint}…`}</p>
      </div>

      <div className="panel">
        <h2>History</h2>
        {history.length === 0 ? (
          <p className="muted">No history yet.</p>
        ) : (
          <div className="history">
            {history.map((h) => (
              <div key={h.id} className="historyItem">
                <div className="historyText">{h.text}</div>
                <div className="historyActions">
                  <button className="miniBtn" onClick={() => void reinject(h.text)}>
                    Inject
                  </button>
                  <button className="miniBtn" onClick={() => void copy(h.text)}>
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hint">
        Hotkey: <code>{hotkeyHint}</code>. Closing the window hides it to the system tray.
      </div>
    </div>
  )
}

export default function App() {
  return isOverlayMode ? <OverlayApp /> : <MainApp />
}
