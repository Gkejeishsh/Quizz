import { useStore } from './store'
import { nativeHaptic } from './native'

type Kind = 'light' | 'medium' | 'success' | 'warning'

const patterns: Record<Kind, number | number[]> = {
  light: 8,
  medium: 18,
  success: [12, 40, 22],
  warning: [20, 60, 20],
}

const tones: Record<Kind, { freq: number; dur: number; gain: number } | null> = {
  light: { freq: 880, dur: 0.045, gain: 0.035 },
  medium: { freq: 660, dur: 0.06, gain: 0.04 },
  success: { freq: 1040, dur: 0.16, gain: 0.05 },
  warning: { freq: 420, dur: 0.12, gain: 0.05 },
}

let ctx: AudioContext | null = null

function beep(kind: Kind) {
  const tone = tones[kind]
  if (!tone) return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = ctx ?? new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = tone.freq
    gain.gain.setValueAtTime(tone.gain, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + tone.dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + tone.dur)
  } catch {
    /* audio is optional */
  }
}

/** Haptic + optional soft tone. Both are user-toggleable and never required. */
export function haptic(kind: Kind = 'light') {
  const settings = useStore.getState().settings
  if (settings.haptics) {
    void nativeHaptic(kind).then((handled) => {
      if (handled) return
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(patterns[kind])
      } catch {
        /* ignore */
      }
    })
  }
  if (settings.sound) beep(kind)
}
