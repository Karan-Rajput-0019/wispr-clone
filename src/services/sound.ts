let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
  return audioCtx
}

async function beep(freqHz: number, durationMs: number, volume = 0.06) {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freqHz

    gain.gain.value = volume

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    await new Promise((r) => setTimeout(r, durationMs))
    osc.stop()
  } catch {
    // ignore (audio might be blocked)
  }
}

export async function playStartSound() {
  await beep(880, 55)
  await beep(1245, 65)
}

export async function playStopSound() {
  await beep(1245, 55)
  await beep(880, 70)
}
