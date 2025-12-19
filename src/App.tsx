import { useState } from 'react'
import { startDictation, stopDictation } from './services/audio'
import { injectText } from './services/injector'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('en')

  const handleStart = async () => {
    try {
      setError(null)
      setTranscript('')
      setIsRecording(true)

      await startDictation(
        language,
        (text) => setTranscript(text),
        (err) => {
          setError(err)
          setIsRecording(false)
        }
      )
    } catch (e) {
      setError(String(e))
      setIsRecording(false)
    }
  }

  const handleStop = async () => {
    try {
      setIsRecording(false)
      const finalText = await stopDictation()
      const textToInject = (finalText || transcript).trim()
      if (textToInject.length > 0) {
        await injectText(textToInject)
      }
    } catch (e) {
      setError(String(e))
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      handleStop()
    } else {
      handleStart()
    }
  }

  return (
    <div className="app">
      <h1>Wispr Clone (MVP)</h1>

      <div className="controls">
        <label>
          Language:&nbsp;
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </label>

        <button
          className={isRecording ? 'btn stop' : 'btn start'}
          onClick={toggleRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="panel">
        <h2>Live Transcript</h2>
        <p className="transcript">
          {transcript || 'Press “Start Recording” and speak...'}
        </p>
      </div>

      <div className="hint">
        After you stop, the text will be typed into the currently focused app.
      </div>
    </div>
  )
}

export default App
