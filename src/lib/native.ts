import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { App as NativeApp } from '@capacitor/app'
import { useStore, applyTheme } from './store'
import { sheetRegistry, CLOSE_SHEET_EVENT, EXIT_REQUEST_EVENT } from './sheets'

/**
 * Native shell integration (Capacitor).
 *
 * Every call is guarded by `Capacitor.isNativePlatform()`, so the exact same
 * bundle runs in a browser untouched — the plugins are inert there.
 */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

let initialised = false

export async function initNative(): Promise<void> {
  if (initialised || !isNative()) return
  initialised = true

  try {
    await SplashScreen.hide({ fadeOutDuration: 220 })
  } catch {
    /* harmless: the splash auto-hides on its own */
  }

  applyInsets()
  await refreshStatusBar(applyTheme(useStore.getState().settings.theme))

  try {
    // The system back gesture must do exactly what the in-app back arrow does.
    await NativeApp.addListener('backButton', () => {
      if (!handleHardwareBack()) void NativeApp.minimizeApp?.().catch(() => undefined)
    })
  } catch {
    /* older WebViews still get the history-based back handling */
  }
}

/**
 * The one place that decides what "back" means: close an open sheet first, then
 * leave the quiz through its exit sheet, then go one screen back. Returns false
 * at the root so the caller can minimise the app instead of doing nothing.
 */
export function handleHardwareBack(): boolean {
  const state = useStore.getState()
  if (sheetRegistry.open > 0) {
    window.dispatchEvent(new CustomEvent(CLOSE_SHEET_EVENT))
    return true
  }
  const route = state.routes[state.routes.length - 1]
  if (route?.name === 'play') {
    window.dispatchEvent(new CustomEvent(EXIT_REQUEST_EVENT))
    return true
  }
  if (state.routes.length > 1) {
    state.pop()
    return true
  }
  return false
}

/**
 * Android draws the app edge-to-edge (targetSdk 36 forces it), and some
 * WebViews report zero safe-area insets. Measure env(); if it comes back
 * empty, fall back to sensible status-bar / gesture-bar heights so nothing
 * hides under the system UI.
 */
function applyInsets(): void {
  const root = document.documentElement
  const platform = Capacitor.getPlatform()
  root.classList.add('cap-native', `cap-${platform}`)
  if (platform !== 'android') return

  const measure = (property: string) => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      `padding-top:env(${property},0px)`
    document.body.appendChild(probe)
    const value = parseFloat(getComputedStyle(probe).paddingTop) || 0
    probe.remove()
    return value
  }

  if (measure('safe-area-inset-top') < 12) root.style.setProperty('--inset-top', '26px')
  if (measure('safe-area-inset-bottom') < 6) root.style.setProperty('--inset-bottom', '12px')
}

export async function refreshStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  } catch {
    /* system bars are cosmetic */
  }
}

/** Real haptics on Android; returns false when the platform does it in JS. */
export async function nativeHaptic(kind: 'light' | 'medium' | 'success' | 'warning'): Promise<boolean> {
  if (!isNative()) return false
  try {
    if (kind === 'success' || kind === 'warning') {
      await Haptics.notification({
        type: kind === 'success' ? NotificationType.Success : NotificationType.Warning,
      })
    } else {
      await Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light })
    }
    return true
  } catch {
    return false
  }
}
