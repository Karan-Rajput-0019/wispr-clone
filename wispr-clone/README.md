# Wispr Clone

An open-source voice-to-text desktop application built with Tauri, React, and Deepgram. This is a privacy-focused alternative to commercial dictation tools like Wispr Flow.

## Features

- 🎤 **Voice-to-Text Transcription** - Convert speech to text using Deepgram's API
- ⌨️ **Global Hotkey** - Trigger recording from anywhere with a customizable shortcut
- 🖊️ **Automatic Text Insertion** - Transcribed text is automatically typed into your active application
- 🎨 **Modern UI** - Clean, intuitive interface built with React
- 🔒 **Privacy-Focused** - Your audio is only sent to Deepgram's API, no third-party tracking
- 🖥️ **Cross-Platform** - Works on Windows, macOS, and Linux

## Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **Deepgram API Key** - Get one free at [console.deepgram.com](https://console.deepgram.com)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Karan-Rajput-0019/wispr-clone.git
   cd wispr-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Deepgram API key:
   ```
   VITE_DEEPGRAM_API_KEY=your_key_here
   ```

4. **Run in development mode**
   ```bash
   npm run tauri:dev
   ```

## Building for Production

```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`

## Platform-Specific Setup

### macOS

You need to grant permissions for the app to work properly:

1. **Microphone Access**: System Preferences → Security & Privacy → Microphone
2. **Accessibility Access**: System Preferences → Security & Privacy → Accessibility
   - This is required for typing text into other applications

### Windows

- The app may trigger Windows Defender on first run
- Make sure to allow the app through your firewall if needed

### Linux

- Requires PulseAudio or PipeWire for audio capture
- May need to grant accessibility permissions depending on your desktop environment

## Usage

1. **Launch the application**
2. **Configure settings**
   - Click the settings icon in the top right
   - Add your Deepgram API key
   - Customize the global hotkey (default: `Ctrl+Alt+Space` or `Cmd+Alt+Space` on Mac)
3. **Start recording**
   - Press your global hotkey to start recording
   - Speak your text
   - Press the hotkey again to stop and transcribe
4. **Text appears automatically**
   - The transcribed text will be typed into whatever application you have focused

## Configuration

### Global Hotkey

The default hotkey is `CmdOrCtrl+Alt+Space`. You can customize this in settings.

**Hotkey Format:**
- Use `CmdOrCtrl` for Cmd on Mac, Ctrl on Windows/Linux
- Combine with modifiers: `Alt`, `Shift`
- Examples: `CmdOrCtrl+Shift+D`, `Alt+Space`

### Recording Modes

- **Toggle Mode** (default): Click once to start, click again to stop
- **Push to Talk**: Hold the button/hotkey to record, release to stop

## Development

### Project Structure

```
wispr-clone/
├── src/                      # React frontend
│   ├── components/          # React components
│   │   ├── AudioRecorder.tsx
│   │   └── Settings.tsx
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── styles.css           # Global styles
├── src-tauri/               # Rust backend
│   ├── src/
│   │   └── main.rs          # Tauri commands and setup
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── package.json             # Node dependencies
└── vite.config.ts           # Vite configuration
```

### Key Technologies

- **Frontend**: React, TypeScript, Vite
- **Backend**: Rust, Tauri
- **Speech-to-Text**: Deepgram API
- **Keyboard Simulation**: Enigo (Rust crate)

## Troubleshooting

### Microphone not working
- Check system permissions
- Try restarting the application
- Verify your browser/OS has granted microphone access

### Transcription fails
- Verify your Deepgram API key is correct
- Check your internet connection
- Ensure you have API credits remaining

### Text not typing automatically
- Grant accessibility permissions (especially on macOS)
- Try clicking into a text field first
- Check if the app has focus

### Hotkey not working
- Make sure the hotkey isn't conflicting with system shortcuts
- Try restarting the app after changing the hotkey
- Some applications block global shortcuts

## API Costs

Deepgram offers a generous free tier:
- **$200 in free credits** for new signups
- **Pay-as-you-go pricing** after that
- Approximately **$0.0043 per minute** of audio

For personal use, the free tier should last several months.

## Alternatives to Deepgram

You can modify the code to use other speech-to-text services:

- **OpenAI Whisper** (local/API) - More private, requires setup
- **Google Cloud Speech-to-Text**
- **Azure Speech Services**
- **Assembly AI**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [Wispr Flow](https://wisprai.co/)
- Built with [Tauri](https://tauri.app/)
- Speech-to-text powered by [Deepgram](https://deepgram.com/)

## Roadmap

- [ ] Add support for local Whisper models
- [ ] Implement real-time streaming transcription
- [ ] Add text formatting options (uppercase, lowercase, etc.)
- [ ] Support for multiple languages
- [ ] Custom commands and macros
- [ ] Clipboard integration
- [ ] Statistics and usage tracking
- [ ] Dark/light theme toggle

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

---

Made with ❤️ by the open-source community