import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { App as NativeApp } from '@capacitor/app'
import { useStore, applyTheme } from './store'

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

  await refreshStatusBar(applyTheme(useStore.getState().settings.theme))

  try {
    await NativeApp.addListener('backButton', () => {
      // Route the hardware back gesture through the same path as the in-app
      // back button: close an open sheet, leave the quiz via its exit sheet,
      // otherwise go back one screen; at the root, minimise the app.
      const event = new CustomEvent('quizz:hardware-back', { cancelable: true })
      window.dispatchEvent(event)
      if (event.defaultPrevented) return
      const state = useStore.getState()
      if (state.routes.length > 1) state.pop()
      else void NativeApp.minimizeApp?.().catch(() => undefined)
    })
  } catch {
    /* older WebViews still get the history-based back handling */
  }
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
