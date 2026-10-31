import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { percent } from '../lib/scoring'
import { formatDate } from '../lib/dates'
import { Page, EmptyState, Sheet } from '../components/ui'
import { Clock, History as HistoryIcon, Play, Target, Trophy, ChevronRight } from '../components/Icons'
import type { Attempt } from '../lib/types'
import { cn } from '../lib/cn'

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 62
  const h = 24
  const max = 100
  const step = w / (values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]
  return (
    <svg width={w} height={h} aria-hidden="true" style={{ width: w, height: h, overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={w} cy={h - (last / max) * (h - 4) - 2} r={2.6} fill="var(--accent)" />
    </svg>
  )
}

export function HistoryScreen() {
  const attempts = useStore((s) => s.attempts)
  const tests = useStore((s) => s.tests)
  const pop = useStore((s) => s.pop)
  const push = useStore((s) => s.push)
  const [openTestId, setOpenTestId] = useState<string | null>(null)

  const stats = useMemo(() => {
    if (!attempts.length) return null
    const pcts = attempts.map((a) => percent(a.score, a.total))
    return {
      count: attempts.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      best: Math.max(...pcts),
    }
  }, [attempts])

  const grouped = useMemo(() => {
    const map = new Map<string, Attempt[]>()
    for (const a of attempts) {
      if (!map.has(a.testId)) map.set(a.testId, [])
      map.get(a.testId)!.push(a)
    }
    return [...map.entries()]
      .map(([testId, list]) => {
        const sorted = [...list].sort((a, b) => b.finishedAt - a.finishedAt)
        const best = list.reduce((b, a) => (percent(a.score, a.total) > percent(b.score, b.total) ? a : b))
        return { testId, attempts: sorted, best, latest: sorted[0] }
      })
      .sort((a, b) => b.latest.finishedAt - a.latest.finishedAt)
  }, [attempts])

  const openGroup = grouped.find((g) => g.testId === openTestId)
  const openTest = tests.find((t) => t.id === openTestId)

  return (
    <>
      <Page title="History" subtitle="Your latest scores, automatically" back={pop}>
        {!attempts.length ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="No attempts yet"
            text="Finish a test and its score lands here — best result, latest result and every attempt, newest first."
            action={
              <button className="btn btn--primary btn--sm" onClick={() => push({ name: 'library' })}>
                <Play style={{ width: 15, height: 15 }} /> Choose a test
              </button>
            }
          />
        ) : (
          <>
            <div className="result-stats" style={{ marginTop: 4 }}>
              <div className="result-stat">
                <div className="result-stat__v">{stats?.count}</div>
                <div className="result-stat__l">Attempts</div>
              </div>
              <div className="result-stat">
                <div className="result-stat__v">{stats?.avg}%</div>
                <div className="result-stat__l">Average</div>
              </div>
              <div className="result-stat result-stat--good">
                <div className="result-stat__v">{stats?.best}%</div>
                <div className="result-stat__l">Best</div>
              </div>
            </div>

            <div className="group-label" style={{ marginTop: 10 }}>By test</div>

            <div className="stack gap-3">
              {grouped.map((g, i) => {
                const test = tests.find((t) => t.id === g.testId)
                const pcts = [...g.attempts].reverse().slice(-8).map((a) => percent(a.score, a.total))
                return (
                  <motion.button
                    key={g.testId}
                    className="list-row"
                    onClick={() => setOpenTestId(g.testId)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    style={{ textAlign: 'left' }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--primary-soft)',
                        color: 'var(--primary)',
                        flex: 'none',
                      }}
                    >
                      <Trophy style={{ width: 19, height: 19 }} />
                    </span>
                    <span className="list-row__main">
                      <span className="list-row__title" style={{ display: 'block' }}>
                        {test?.name ?? g.attempts[0].testName}
                      </span>
                      <span className="list-row__meta">
                        {!test && <span style={{ color: 'var(--danger)' }}>deleted</span>}
                        {!test && <span className="sep">·</span>}
                        <span>{g.attempts.length} attempt{g.attempts.length > 1 ? 's' : ''}</span>
                        <span className="sep">·</span>
                        <span>last {percent(g.latest.score, g.latest.total)}%</span>
                        <span className="sep">·</span>
                        <span>{formatDate(g.latest.finishedAt)}</span>
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', flex: 'none' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 600 }}>
                        {percent(g.best.score, g.best.total)}%
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>best</span>
                    </span>
                    <ChevronRight style={{ width: 16, height: 16, opacity: 0.45, flex: 'none' }} />
                    <span style={{ flex: 'none', display: 'block' }}>
                      <Sparkline values={pcts.length ? pcts : [percent(g.latest.score, g.latest.total)]} />
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </Page>

      <Sheet
        open={!!openGroup}
        onClose={() => setOpenTestId(null)}
        title={openTest?.name ?? openGroup?.attempts[0].testName ?? 'Attempts'}
        desc={openGroup ? `${openGroup.attempts.length} attempt${openGroup.attempts.length > 1 ? 's' : ''} · newest first` : ''}
      >
        <div className="stack gap-2">
          {openGroup?.attempts.map((a) => (
            <button
              key={a.id}
              className="list-row"
              style={{ padding: '12px 14px' }}
              onClick={() => {
                setOpenTestId(null)
                push({ name: 'results', attemptId: a.id })
              }}
            >
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{formatDate(a.finishedAt)}</span>
                <span style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                  <span className="row gap-1">
                    <Clock style={{ width: 12, height: 12 }} /> {Math.round(a.durationMs / 60000)} min
                  </span>
                  <span className="row gap-1">
                    <Target style={{ width: 12, height: 12 }} /> {a.marked}/{a.total} answered
                  </span>
                  {a.timed && <span className="badge" style={{ height: 18, fontSize: 10 }}>timed</span>}
                  {a.timeUp && <span className="badge badge--warn" style={{ height: 18, fontSize: 10 }}>time up</span>}
                </span>
              </span>
              <span
                className={cn('badge')}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  background:
                    percent(a.score, a.total) >= 75
                      ? 'var(--success-soft)'
                      : percent(a.score, a.total) < 40
                        ? 'var(--danger-soft)'
                        : 'var(--surface-2)',
                  color:
                    percent(a.score, a.total) >= 75
                      ? 'var(--success)'
                      : percent(a.score, a.total) < 40
                        ? 'var(--danger)'
                        : 'var(--ink-2)',
                }}
              >
                {a.score}/{a.total}
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
