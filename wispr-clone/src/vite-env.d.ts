/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPGRAM_API_KEY?: string
  readonly VITE_AUDIO_SAMPLE_RATE?: string
  readonly VITE_AUDIO_CHANNELS?: string
  readonly VITE_RECORDING_MODE?: string
  readonly VITE_OPENAI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}