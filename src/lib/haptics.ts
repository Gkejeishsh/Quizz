import { useStore } from './store'

type Kind = 'light' | 'medium' | 'success' | 'warning'

const patterns: Record<Kind, number | number[]> = {
  light: 8,
  medium: 18,
  success: [12, 40, 22],
  warning: [20, 60, 20],
}

export function haptic(kind: Kind = 'light') {
  try {
    if (!useStore.getState().settings.haptics) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(patterns[kind])
    }
  } catch {
    /* haptics are optional */
  }
}
