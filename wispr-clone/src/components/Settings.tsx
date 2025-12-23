import { useState } from "react";
import { Save, Key, Keyboard } from "lucide-react";

interface SettingsProps {
  settings: {
    hotkey: string;
    recordingMode: "toggle" | "push_to_talk";
    deepgramApiKey: string;
  };
  onSettingsChange: (settings: any) => void;
}

export default function Settings({ settings, onSettingsChange }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInputChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-group">
        <label>
          <Key size={18} />
          <span>Deepgram API Key</span>
        </label>
        <input
          type="password"
          value={localSettings.deepgramApiKey}
          onChange={(e) => handleInputChange("deepgramApiKey", e.target.value)}
          placeholder="Enter your Deepgram API key"
        />
        <p className="settings-help">
          Get your API key from{" "}
          <a href="https://console.deepgram.com" target="_blank" rel="noopener noreferrer">
            console.deepgram.com
          </a>
        </p>
      </div>

      <div className="settings-group">
        <label>
          <Keyboard size={18} />
          <span>Global Hotkey</span>
        </label>
        <input
          type="text"
          value={localSettings.hotkey}
          onChange={(e) => handleInputChange("hotkey", e.target.value)}
          placeholder="e.g., CmdOrCtrl+Alt+Space"
        />
        <p className="settings-help">
          Format: CmdOrCtrl+Alt+Key (restart required for changes)
        </p>
      </div>

      <div className="settings-group">
        <label>
          <span>Recording Mode</span>
        </label>
        <select
          value={localSettings.recordingMode}
          onChange={(e) =>
            handleInputChange("recordingMode", e.target.value)
          }
        >
          <option value="toggle">Toggle (click to start/stop)</option>
          <option value="push_to_talk">Push to Talk (hold to record)</option>
        </select>
      </div>

      <button className="save-button" onClick={handleSave}>
        <Save size={18} />
        {saved ? "Saved!" : "Save Settings"}
      </button>

      <div className="settings-info">
        <h3>About Wispr Clone</h3>
        <p>
          An open-source voice-to-text desktop application built with Tauri and
          Deepgram.
        </p>
        <p>
          <strong>How to use:</strong>
        </p>
        <ol>
          <li>Add your Deepgram API key above</li>
          <li>Save settings</li>
          <li>Press the global hotkey to start recording</li>
          <li>Speak your text</li>
          <li>Press the hotkey again to stop and transcribe</li>
        </ol>
      </div>
    </div>
  );
}