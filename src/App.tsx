import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { applyTheme, useStore, type Route } from './lib/store'
import { initNative, refreshStatusBar } from './lib/native'
import { Toasts, sheetRegistry, CLOSE_SHEET_EVENT } from './components/ui'
import { LogoMark } from './components/Logo'
import { Home } from './screens/Home'
import { ImportScreen } from './screens/Import'
import { Library } from './screens/Library'
import { TestDetail } from './screens/TestDetail'
import { Play } from './screens/Play'
import { Results } from './screens/Results'
import { Review } from './screens/Review'
import { HistoryScreen } from './screens/History'
import { CategoriesScreen } from './screens/Categories'
import { SettingsScreen } from './screens/Settings'

function routeKey(route: Route): string {
  switch (route.name) {
    case 'test':
      return `test:${route.testId}`
    case 'play':
      return `play:${route.testId}`
    case 'results':
      return `results:${route.attemptId}`
    case 'review':
      return `review:${route.testId}:${route.attemptId ?? 'none'}`
    default:
      return route.name
  }
}

function screenFor(route: Route) {
  switch (route.name) {
    case 'home':
      return <Home />
    case 'import':
      return <ImportScreen />
    case 'library':
      return <Library />
    case 'test':
      return <TestDetail testId={route.testId} />
    case 'play':
      return <Play testId={route.testId} />
    case 'results':
      return <Results attemptId={route.attemptId} />
    case 'review':
      return <Review testId={route.testId} attemptId={route.attemptId} />
    case 'history':
      return <HistoryScreen />
    case 'categories':
      return <CategoriesScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const hydrate = useStore((s) => s.hydrate)
  const routes = useStore((s) => s.routes)
  const settings = useStore((s) => s.settings)
  const reduce = useReducedMotion()

  useEffect(() => {
    void hydrate().then(() => initNative())
  }, [hydrate])

  useEffect(() => {
    const resolved = applyTheme(settings.theme)
    void refreshStatusBar(resolved)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (useStore.getState().settings.theme === 'system') applyTheme('system')
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dataset.fontscale = settings.fontScale
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion)
  }, [settings.fontScale, settings.reduceMotion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (sheetRegistry.open > 0) {
        window.dispatchEvent(new CustomEvent(CLOSE_SHEET_EVENT))
        return
      }
      const state = useStore.getState()
      if (state.routes.length > 1) state.pop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // hardware / browser back: keep one history entry per screen so Android's
  // back gesture behaves like a native app instead of leaving the app.
  const depth = useRef(routes.length)
  const skipPop = useRef(false)

  useEffect(() => {
    const onHardwareBack = (event: Event) => {
      const state = useStore.getState()
      const route = state.routes[state.routes.length - 1]
      if (sheetRegistry.open > 0) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent(CLOSE_SHEET_EVENT))
        return
      }
      if (route.name === 'play') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('quizz:exit-request'))
        return
      }
      if (state.routes.length > 1) event.preventDefault()
    }
    window.addEventListener('quizz:hardware-back', onHardwareBack)

    const onPop = () => {
      if (skipPop.current) {
        skipPop.current = false
        return
      }
      if (sheetRegistry.open > 0) {
        history.pushState({ depth: useStore.getState().routes.length }, '')
        window.dispatchEvent(new CustomEvent(CLOSE_SHEET_EVENT))
        return
      }
      const state = useStore.getState()
      if (state.routes.length <= 1) return
      const current = state.routes[state.routes.length - 1]
      if (current.name === 'play') {
        history.pushState({ depth: state.routes.length }, '')
        window.dispatchEvent(new CustomEvent('quizz:exit-request'))
        return
      }
      state.pop()
    }
    window.addEventListener('popstate', onPop)
    if (!history.state || typeof history.state.depth !== 'number') {
      history.replaceState({ depth: routes.length }, '')
    }
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('quizz:hardware-back', onHardwareBack)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (routes.length > depth.current) {
      history.pushState({ depth: routes.length }, '')
    } else if (routes.length < depth.current) {
      if ((history.state?.depth ?? 1) > 1) {
        skipPop.current = true
        history.back()
      }
    }
    depth.current = routes.length
  }, [routes.length])

  const route = routes[routes.length - 1]
  const key = useMemo(() => routeKey(route), [route])

  if (!hydrated) {
    return (
      <div className="app">
        <div className="app-glow" />
        <div className="app-frame" style={{ display: 'grid', placeItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.05, 0.7, 0.1, 1] }}
            style={{ display: 'grid', gap: 14, justifyItems: 'center' }}
          >
            <LogoMark size={64} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em' }}>
              Quiz<span className="grad-text">z</span>
            </div>
            <div className="skeleton" style={{ width: 120, height: 5, borderRadius: 9 }} />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app-glow" />
      <div className="app-frame">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0.001 : 0.24, ease: [0.05, 0.7, 0.1, 1] }}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}
            onAnimationComplete={() => {
              if (window.scrollY) window.scrollTo(0, 0)
            }}
          >
            {screenFor(route)}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toasts />
    </div>
  )
}
