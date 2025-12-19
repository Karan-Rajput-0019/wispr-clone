# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What this repo is
A minimal **Tauri (Rust) + Vite/React (TypeScript)** desktop app that:
- Captures microphone audio in the frontend, streams it to **Deepgram** over WebSocket, and displays the live transcript.
- On stop, tries to **inject/“type”** the final transcript into the currently focused app via a Tauri command; if that fails, falls back to copying to clipboard.

## Common commands
All commands assume the repo root.

### Install
- Install JS deps:
  - `npm ci` (preferred when `package-lock.json` is present)
  - `npm install` (fallback)

### Frontend (Vite)
- Dev server:
  - `npm run dev`
- Production build:
  - `npm run build`
- Preview production build:
  - `npm run preview`

### Desktop app (Tauri)
- Run desktop app in dev (starts Vite via `beforeDevCommand` in `tauri.conf.json`):
  - `npm run tauri:dev`
- Build desktop app bundle:
  - `npm run tauri:build`
- Inspect Tauri environment + detected configuration:
  - `npm run tauri -- info`

Notes for Windows builds:
- `npm run tauri -- info` currently reports missing **Visual Studio / MSVC build tools + Windows SDK** in this environment; Rust/Tauri builds will fail until those are installed.

### TypeScript typecheck
- `npm run typecheck`

### Lint / tests
No linting or test runner scripts are configured in `package.json` currently.

## Configuration / secrets
- Deepgram API key is read from `import.meta.env.VITE_DEEPGRAM_API_KEY` in `src/services/audio.ts`.
- Example file: `.env.example`.

Vite loads `.env*` from the repo root. For local dev, create a root `.env` with `VITE_DEEPGRAM_API_KEY=...`.

## Architecture overview (big picture)
### Frontend (React/Vite)
Entry points and main flow:
- `src/main.tsx`: mounts React.
- `src/App.tsx`: UI + state machine.
  - `startDictation(...)` starts recording/streaming.
  - `stopDictation()` stops recording; then `injectText(...)` is called.

Service modules:
- `src/services/audio.ts`
  - Uses `navigator.mediaDevices.getUserMedia` + `MediaRecorder`.
  - Streams audio chunks to Deepgram via WebSocket (`wss://api.deepgram.com/v1/listen?...`).
  - Parses Deepgram messages; updates transcript when `is_final`.
- `src/services/injector.ts`
  - Calls Tauri via `invoke('inject_text', { text })`.
  - If the command is unavailable/errors, falls back to `navigator.clipboard.writeText`.

### Tauri backend (Rust)
Current Tauri project layout is slightly non-standard:
- Primary Tauri project appears under `src-tauri/src-tauri/` (contains `tauri.conf.json`, `Cargo.toml`, and `src/main.rs`).
  - `tauri.conf.json` runs the frontend via:
    - `beforeDevCommand: npm run dev`
    - `beforeBuildCommand: npm run build`
    - `devPath: http://localhost:5173`
    - `distDir: ../dist`

Command bridge:
- The frontend calls `invoke('inject_text', { text })` from `src/services/injector.ts`.
- The active backend (`src-tauri/src-tauri/src/main.rs`) implements `inject_text` using `enigo` to type into the currently focused app.

Global hotkey:
- Rust registers `Ctrl+Shift+Space` and emits a `toggle-recording` event.
- React listens for `toggle-recording` in `src/App.tsx` and toggles start/stop.

Overlay (flow bar):
- Rust creates an always-on-top window labeled `overlay` loading `index.html?overlay=1`.
- The overlay UI listens for `wispr:update` events and auto-hides when idle.

System tray:
- Closing the main window hides it to tray.
- Tray menu provides Show/Hide, Start/Stop, and Quit.
