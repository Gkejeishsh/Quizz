import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import { ArrowLeft, Check, CheckCircle, Info, AlertCircle } from './Icons'

export const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 900, damping: 42, mass: 0.7 }
export const SPRING_SETTLE = { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.9 }
export const SPRING_SHEET = { type: 'spring' as const, stiffness: 380, damping: 34, mass: 1 }
export const SPRING_SOFT = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 1 }

/* ------------------------------------------------------------------ page */

export function Page({
  title,
  subtitle,
  back,
  right,
  children,
  footer,
  flush = false,
  bare = false,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  back?: () => void
  right?: ReactNode
  children: ReactNode
  footer?: ReactNode
  flush?: boolean
  bare?: boolean
}) {
  return (
    <div className="screen">
      {!bare && (
        <header className="appbar">
          {back && (
            <button className="icon-btn" onClick={back} aria-label="Back">
              <ArrowLeft />
            </button>
          )}
          <div className="grow">
            {title && <div className="appbar-title">{title}</div>}
            {subtitle && <div className="appbar-sub">{subtitle}</div>}
          </div>
          {right}
        </header>
      )}
      <div className={cn('screen-body', flush && 'flush')}>{children}</div>
      {footer}
    </div>
  )
}

/* ------------------------------------------------------------------ sheet */

export function Sheet({
  open,
  onClose,
  title,
  desc,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  desc?: ReactNode
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={SPRING_SHEET}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose()
            }}
          >
            <div className="sheet__handle" />
            {title && <div className="sheet__title">{title}</div>}
            {desc && <div className="sheet__desc">{desc}</div>}
            <div className="stack gap-4" style={{ marginTop: title ? 18 : 4 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ toasts */

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={cn('toast', t.tone === 'success' && 'toast--success', t.tone === 'error' && 'toast--error')}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={SPRING_SNAPPY}
            onClick={() => dismiss(t.id)}
          >
            {t.tone === 'success' ? <CheckCircle /> : t.tone === 'error' ? <AlertCircle /> : <Info />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ switch */

export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn('switch', on && 'switch--on')}
      onClick={() => {
        haptic('light')
        onChange(!on)
      }}
    />
  )
}

/* ------------------------------------------------------------------ segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const uidSeg = useId()
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-pill)',
        border: '1px solid var(--line)',
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => {
              haptic('light')
              onChange(o.value)
            }}
            style={{
              position: 'relative',
              flex: 1,
              height: 34,
              borderRadius: 'var(--r-pill)',
              fontSize: 13,
              fontWeight: 650,
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              transition: 'color .15s',
            }}
          >
            {active && (
              <motion.span
                layoutId={`segmented-active-${uidSeg}`}
                transition={SPRING_SNAPPY}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--surface)',
                  borderRadius: 'var(--r-pill)',
                  boxShadow: '0 1px 2px rgba(0,0,0,.12)',
                }}
              />
            )}
            <span style={{ position: 'relative' }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ ring */

export function ScoreRing({
  value,
  total,
  size = 176,
  label = 'score',
  tone = 'brand',
  delay = 0.15,
}: {
  value: number
  total: number
  size?: number
  label?: string
  tone?: 'brand' | 'good' | 'bad'
  delay?: number
}) {
  const reduce = useReducedMotion()
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const stroke =
    tone === 'good' ? 'var(--success)' : tone === 'bad' ? 'var(--danger)' : 'var(--grad-brand)'

  const [display] = useCountUp(pct, reduce ? 0 : 900)
  const gradId = `ring-${tone}`

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8E8DFF" />
            <stop offset="55%" stopColor="#5A5BF0" />
            <stop offset="100%" stopColor="#38E1F0" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={11} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone === 'brand' ? `url(#${gradId})` : stroke}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c - (pct / 100) * c : c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 10px rgba(114,107,255,.35))' }}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-score" style={{ fontSize: Math.round(size * 0.3) }}>
          {display}
          <span style={{ fontSize: '0.5em', opacity: 0.6 }}>%</span>
        </div>
        <div className="ring-sub">{label}</div>
      </div>
    </div>
  )
}

export function useCountUp(target: number, duration = 800): [number, (n: number) => void] {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (duration <= 0) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, setValue])
  return [value, setValue]
}

/* ------------------------------------------------------------------ confetti */

export function Confetti({ show }: { show: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const reduce = useReducedMotion()
  const settingReduce = useStore((s) => s.settings.reduceMotion)

  useEffect(() => {
    if (!show || reduce || settingReduce) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const colors = ['#8E8DFF', '#38E1F0', '#3BE0B0', '#FFD166', '#FF6B76', '#EDEFF8']
    const parts = Array.from({ length: 74 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 60,
      y: h * 0.32 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 7.5,
      vy: -Math.random() * 8 - 2,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }))

    let raf = 0
    let last = performance.now()
    const start = last

    const draw = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67
      last = now
      ctx.clearRect(0, 0, w, h)
      let alive = false
      for (const p of parts) {
        p.vy += 0.28 * dt
        p.vx *= 0.995
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        const age = (now - start) / 1500
        p.life = Math.max(0, 1 - age)
        if (p.y < h + 40 && p.life > 0) alive = true
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [show, reduce, settingReduce])

  if (!show) return null
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}

/* ------------------------------------------------------------------ empty */

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__art">{icon}</div>
      <div className="empty__title">{title}</div>
      <div className="empty__text">{text}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  )
}

export function IconText({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="row gap-2" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 16, height: 16, flex: 'none' }}>{icon}</span>
      {children}
    </span>
  )
}

export function Tick({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <Check style={{ width: 18, height: 18 }} />
}
