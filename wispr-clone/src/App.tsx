import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import AudioRecorder from "./components/AudioRecorder";
import Settings from "./components/Settings";
import { Settings as SettingsIcon, Mic, Info } from "lucide-react";

interface AppSettings {
  hotkey: string;
  recordingMode: "toggle" | "push_to_talk";
  deepgramApiKey: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [settings, setSettings] = useState<AppSettings>({
    hotkey: "CmdOrCtrl+Alt+Space",
    recordingMode: "toggle",
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY ?? "",
  });

  useEffect(() => {
    // Listen for hotkey toggle events from Rust backend
    const unlisten = listen("toggle-recording", () => {
      setIsRecording((prev) => !prev);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("wispr-settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem("wispr-settings", JSON.stringify(newSettings));
  };

  const handleTranscription = (text: string) => {
    setTranscription(text);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Mic className="logo-icon" size={24} />
          <h1>Wispr Clone</h1>
        </div>
        <button
          className="icon-button"
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <main className="main-content">
        {showSettings ? (
          <Settings settings={settings} onSettingsChange={handleSettingsChange} />
        ) : (
          <>
            <AudioRecorder
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
              onTranscription={handleTranscription}
              apiKey={settings.deepgramApiKey}
            />

            <div className="info-section">
              <div className="info-card">
                <Info size={16} />
                <p>Press <kbd>{settings.hotkey}</kbd> to start/stop recording</p>
              </div>

              {transcription && (
                <div className="transcription-box">
                  <h3>Last Transcription:</h3>
                  <p>{transcription}</p>
                </div>
              )}
            </div>

            <div className="status-bar">
              <div className={`status-indicator ${isRecording ? "recording" : ""}`}>
                <span className="status-dot"></span>
                {isRecording ? "Recording..." : "Ready"}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;