import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { LogoMark } from './Logo'

/**
 * The animated launch screen. Android shows the static splash drawable while the
 * WebView boots; this takes over the moment React paints, animates the mark in,
 * reports loading progress, and hands over to the app.
 */
export function SplashOverlay({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduce = useReducedMotion()
  const [progress, setProgress] = useState(6)
  const [leaving, setLeaving] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // ease toward 92% while hydrating, then snap to 100%
  useEffect(() => {
    if (ready) return
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + (92 - p) * 0.16))
    }, 90)
    return () => window.clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!ready) return
    setProgress(100)
    // long enough to be seen, short enough to never feel like a wait
    const hold = Math.max(0, (reduce ? 120 : 700) - (Date.now() - mountedAt))
    const t = window.setTimeout(() => setLeaving(true), hold)
    return () => window.clearTimeout(t)
  }, [ready, mountedAt, reduce])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => doneRef.current(), reduce ? 120 : 480)
    return () => window.clearTimeout(t)
  }, [leaving, reduce])

  const words = ['Q', 'u', 'i', 'z', 'z']

  return (
    <motion.div
      className="splash"
      role="status"
      aria-live="polite"
      aria-label="Loading Quizz"
      initial={{ opacity: 1 }}
      animate={leaving ? { opacity: 0, scale: reduce ? 1 : 1.06 } : { opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0.12 : 0.46, ease: [0.05, 0.7, 0.1, 1] }}
      style={{ pointerEvents: leaving ? 'none' : 'auto' }}
    >
      <div className="splash__orb splash__orb--a" aria-hidden="true" />
      <div className="splash__orb splash__orb--b" aria-hidden="true" />
      <div className="splash__grid" aria-hidden="true" />

      <div className="splash__stage">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72, rotate: -10, y: 10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          transition={
            reduce
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 240, damping: 17, mass: 0.9, delay: 0.08 }
          }
          className="splash__mark"
        >
          <LogoMark size={104} animated />
          <motion.span
            className="splash__ring"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1.45, 1.7] }}
            transition={{ duration: 1.5, delay: 0.32, ease: 'easeOut' }}
          />
        </motion.div>

        <div className="splash__word" aria-hidden="true">
          {words.map((ch, i) => (
            <motion.span
              key={i}
              className={i === words.length - 1 ? 'splash__letter splash__letter--accent' : 'splash__letter'}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.24 + i * 0.055, duration: 0.42, ease: [0.05, 0.7, 0.1, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <motion.p
          className="splash__tag"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Practice, marked instantly.
        </motion.p>

        <div className="splash__bar" aria-hidden="true">
          <motion.span
            className="splash__bar-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          />
        </div>
      </div>

      <motion.div
        className="splash__foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        Works offline · No account needed
      </motion.div>
    </motion.div>
  )
}
