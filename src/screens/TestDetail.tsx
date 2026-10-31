import { useState } from 'react'
import { useStore, categoryById, bestAttempts, latestAttempt } from '../lib/store'
import { percent } from '../lib/scoring'
import { formatDate } from '../lib/dates'
import { Page, Sheet, ScoreRing, IconText } from '../components/ui'
import { BookOpen, Clock, Dots, FileText, Lightning, Play, Refresh } from '../components/Icons'
import { useTestActions } from '../components/TestActions'
import { haptic } from '../lib/haptics'
import { motion } from 'motion/react'

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60]

export function TestDetail({ testId }: { testId: string }) {
  const test = useStore((s) => s.tests.find((t) => t.id === testId))
  const categories = useStore((s) => s.categories)
  const attempts = useStore((s) => s.attempts)
  const drafts = useStore((s) => s.drafts)
  const push = useStore((s) => s.push)
  const pop = useStore((s) => s.pop)
  const saveDraft = useStore((s) => s.saveDraft)

  const actions = useTestActions(() => {
    pop()
    push({ name: 'library' })
  })

  const [startOpen, setStartOpen] = useState(false)
  const [timerOn, setTimerOn] = useState(false)
  const [minutes, setMinutes] = useState(20)
  const [custom, setCustom] = useState('')
  const [starting, setStarting] = useState(false)

  if (!test) {
    return (
      <Page title="Test" back={pop}>
        <div className="empty">
          <div className="empty__title">This test was deleted</div>
          <p className="empty__text">It is no longer in your library.</p>
          <button className="btn btn--primary btn--sm" onClick={() => push({ name: 'library' })}>
            Back to saved tests
          </button>
        </div>
      </Page>
    )
  }

  const category = categoryById(categories, test.categoryId)
  const best = bestAttempts(attempts, test.id)
  const latest = latestAttempt(attempts, test.id)
  const draft = drafts.find((d) => d.testId === test.id)
  const attemptCount = attempts.filter((a) => a.testId === test.id).length
  const explained = test.pack.questions.filter((q) => q.explanation).length

  const start = (fresh: boolean) => {
    setStarting(true)
    haptic('medium')
    const mins = custom.trim() ? Number(custom) : minutes
    const valid = Number.isFinite(mins) && mins >= 1 && mins <= 180
    const questionNs = test.pack.questions.map((q) => q.n)
    const deadline = timerOn && valid ? Date.now() + Math.round(mins) * 60_000 : null
    saveDraft({
      testId: test.id,
      testName: test.name,
      answers: fresh || !draft ? {} : draft.answers,
      index: fresh || !draft ? 0 : draft.index,
      questionNs,
      startedAt: fresh || !draft ? Date.now() : draft.startedAt,
      deadline,
      timed: !!deadline,
    })
    setStarting(false)
    setStartOpen(false)
    push({ name: 'play', testId: test.id })
  }

  return (
    <>
      <Page
        title={test.name}
        subtitle={category.name}
        back={pop}
        right={
          <button className="icon-btn" onClick={() => actions.open(test)} aria-label="Test actions">
            <Dots />
          </button>
        }
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="card card--hero" style={{ textAlign: 'center', paddingTop: 22 }}>
            <div
              className="label"
              style={{ color: category.color, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
            >
              <span className="dot" style={{ background: category.color }} />
              {category.name}
            </div>
            <h1 className="display" style={{ fontSize: 27, marginTop: 8, lineHeight: 1.15 }}>
              {test.name}
            </h1>

            <div style={{ display: 'grid', placeItems: 'center', marginTop: 8 }}>
              {best ? (
                <ScoreRing value={best.score} total={best.total} size={150} label="best score" tone="brand" />
              ) : (
                <div style={{ padding: '26px 0 18px' }}>
                  <div className="display-xl grad-text">{test.questionCount}</div>
                  <div className="label" style={{ marginTop: 4 }}>questions</div>
                </div>
              )}
            </div>

            <div className="row gap-2 center wrap" style={{ marginTop: 4 }}>
              <span className="badge">
                <FileText /> {test.questionCount} questions
              </span>
              <span className="badge">
                <BookOpen /> {explained} explanations
              </span>
              {attemptCount > 0 && (
                <span className="badge badge--brand">
                  <Refresh /> {attemptCount} attempt{attemptCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {draft && (
            <div className="card" style={{ marginTop: 14, borderColor: 'var(--primary)', background: 'var(--primary-soft)' }}>
              <div className="row-between gap-3">
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 650 }}>
                    {Object.keys(draft.answers).length} of {draft.questionNs.length} answered
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
                    Unfinished attempt saved on this device.
                  </div>
                </div>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    push({ name: 'play', testId: test.id })
                  }}
                >
                  <Play style={{ width: 14, height: 14 }} /> Resume
                </button>
              </div>
            </div>
          )}

          <div className="stack gap-3" style={{ marginTop: 18 }}>
            <button
              className="btn btn--primary btn--lg btn--block"
              onClick={() => {
                haptic('light')
                setTimerOn(false)
                setCustom('')
                setStartOpen(true)
              }}
            >
              <Play /> Start test
            </button>
            <button
              className="btn btn--secondary btn--lg btn--block"
              disabled={explained === 0}
              onClick={() => push({ name: 'review', testId: test.id })}
              title={explained === 0 ? 'This test has no explanations' : undefined}
            >
              <BookOpen /> Show explanation
            </button>
            {explained === 0 && (
              <p className="subtitle" style={{ fontSize: 12.5, textAlign: 'center', marginTop: -4 }}>
                This test’s file didn’t include explanations.
              </p>
            )}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="label" style={{ marginBottom: 10 }}>Details</div>
            <div className="stack">
              <div className="inset-row" style={{ borderBottom: '1px solid var(--line)', paddingBlock: 10 }}>
                <IconText icon={<Clock />}>Saved</IconText>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{formatDate(test.savedDate)}</span>
              </div>
              {latest && (
                <div className="inset-row" style={{ borderBottom: '1px solid var(--line)', paddingBlock: 10 }}>
                  <IconText icon={<Refresh />}>Last attempt</IconText>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {formatDate(latest.finishedAt)} · {percent(latest.score, latest.total)}%
                  </span>
                </div>
              )}
              <div className="inset-row" style={{ borderBottom: '1px solid var(--line)', paddingBlock: 10 }}>
                <IconText icon={<FileText />}>Source</IconText>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {test.sourceFileName ?? 'Not recorded'}
                </span>
              </div>
              <div className="inset-row" style={{ paddingBlock: 10 }}>
                <IconText icon={<Lightning />}>Stored on device</IconText>
                <span className="badge badge--good">offline</span>
              </div>
            </div>
          </div>
        </motion.div>
      </Page>

      <Sheet open={startOpen} onClose={() => setStartOpen(false)} title="Start test" desc={`${test.questionCount} questions · ${category.name}`}>
        <div className="row-between" style={{ padding: '4px 2px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 650 }}>Timer</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>One-time only — it is never saved.</div>
          </div>
          <button
            role="switch"
            aria-checked={timerOn}
            aria-label="Enable timer for this attempt"
            className={`switch ${timerOn ? 'switch--on' : ''}`}
            onClick={() => {
              haptic('light')
              setTimerOn((v) => !v)
            }}
          />
        </div>

        {timerOn && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
            <div className="stack gap-3" style={{ paddingTop: 6 }}>
              <div className="chip-scroll" style={{ marginInline: 0, paddingInline: 0 }}>
                {QUICK_MINUTES.map((m) => (
                  <button
                    key={m}
                    className={`chip ${minutes === m && !custom ? 'chip--active' : ''}`}
                    onClick={() => {
                      setMinutes(m)
                      setCustom('')
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <div className="row gap-2">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Custom minutes (1–180)"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <p className="subtitle" style={{ fontSize: 12.5 }}>
                <Clock style={{ width: 13, height: 13, verticalAlign: '-2px', marginRight: 4 }} />
                {(custom ? Number(custom) : minutes) || 0} minutes · about{' '}
                {Math.max(1, Math.round((((custom ? Number(custom) : minutes) || 0) * 60) / Math.max(1, test.questionCount)))}s per question
              </p>
            </div>
          </motion.div>
        )}

        {draft && (
          <div className="stack gap-2" style={{ marginTop: 4 }}>
            <button className="btn btn--primary btn--block" onClick={() => start(false)} disabled={starting}>
              Continue saved attempt
            </button>
            <button className="btn btn--soft btn--block" onClick={() => start(true)} disabled={starting}>
              Start over
            </button>
            <p className="subtitle" style={{ fontSize: 12.5, textAlign: 'center' }}>
              Starting over clears this attempt’s answers.
            </p>
          </div>
        )}
        {!draft && (
          <button className="btn btn--primary btn--block btn--lg" onClick={() => start(true)} disabled={starting}>
            Start
          </button>
        )}
      </Sheet>

      {actions.sheet}
    </>
  )
}
