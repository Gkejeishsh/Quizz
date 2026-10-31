import { useStore, applyTheme } from './store'

type SplashScreenPlugin = {
  hide: (options?: { fadeOutDuration?: number }) => Promise<void>
}

type StatusBarPlugin = {
  setStyle: (options: { style: 'DARK' | 'LIGHT' | 'DEFAULT'; backgroundColor?: string }) => Promise<void>
  setOverlaysWebView: (options: { overlay: boolean }) => Promise<void>
}

type HapticsPlugin = {
  impact: (options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>
  notification: (options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>
}

type AppPlugin = {
  addListener: (
    event: 'backButton',
    handler: (event: { canGoBack: boolean }) => void,
  ) => { remove: () => Promise<void> } | void
  minimizeApp: () => Promise<void>
}

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return !!cap?.isNativePlatform?.()
}

async function plugin<T>(name: string): Promise<T | null> {
  try {
    const mod = await import(/* @vite-ignore */ `@capacitor/${name}`)
    return (mod as { [key: string]: unknown })[
      name === 'app' ? 'App' : name === 'status-bar' ? 'StatusBar' : name === 'splash-screen' ? 'SplashScreen' : 'Haptics'
    ] as T
  } catch {
    return null
  }
}

let initialised = false

/** Wire the Capacitor shell: splash, system bars, hardware back, haptics. */
export async function initNative(): Promise<void> {
  if (initialised || !isNative()) return
  initialised = true

  const splash = await plugin<SplashScreenPlugin>('splash-screen')
  splash?.hide({ fadeOutDuration: 220 }).catch(() => undefined)

  const status = await plugin<StatusBarPlugin>('status-bar')
  syncStatusBar(status)

  const app = await plugin<AppPlugin>('app')
  app?.addListener('backButton', () => {
    // Route the hardware back gesture through the same path as the in-app
    // back button: close an open sheet, leave the quiz via its exit sheet,
    // otherwise go back one screen; at the root, minimise the app.
    const event = new CustomEvent('quizz:hardware-back', { cancelable: true })
    window.dispatchEvent(event)
    if (event.defaultPrevented) return
    const state = useStore.getState()
    if (state.routes.length > 1) state.pop()
    else void app.minimizeApp?.()
  })
}

async function syncStatusBar(status: StatusBarPlugin | null) {
  if (!status) return
  const theme = applyTheme(useStore.getState().settings.theme)
  await status.setOverlaysWebView({ overlay: true }).catch(() => undefined)
  await status
    .setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' })
    .catch(() => undefined)
}

/** Keep the status-bar icons readable after a theme change. */
export async function refreshStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return
  const status = await plugin<StatusBarPlugin>('status-bar')
  await status?.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' }).catch(() => undefined)
}

/** True haptics on Android (the web Vibration API is unreliable in WebView). */
export async function nativeHaptic(kind: 'light' | 'medium' | 'success' | 'warning'): Promise<boolean> {
  if (!isNative()) return false
  const haptics = await plugin<HapticsPlugin>('haptics')
  if (!haptics) return false
  try {
    if (kind === 'success' || kind === 'warning') {
      await haptics.notification({ type: kind === 'success' ? 'SUCCESS' : 'WARNING' })
    } else {
      await haptics.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' })
    }
    return true
  } catch {
    return false
  }
}
