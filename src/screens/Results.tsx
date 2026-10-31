import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { scoreQuestions, percent } from '../lib/scoring'
import { formatDuration } from '../lib/dates'
import { Page, ScoreRing, Confetti } from '../components/ui'
import { BookOpen, CheckCircle, Clock, Refresh, Sparkles, Target, X, ChevronDown } from '../components/Icons'
import { MathText } from '../components/MathText'
import { cn } from '../lib/cn'

function tier(pct: number) {
  if (pct >= 90) return { title: 'Outstanding.', sub: 'That is exam-ready work.' }
  if (pct >= 75) return { title: 'Strong work.', sub: 'A few details to tighten up.' }
  if (pct >= 50) return { title: 'Getting there.', sub: 'Review the misses — they are the useful part.' }
  return { title: 'Worth another look.', sub: 'Every wrong answer is a question you now understand better.' }
}

export function Results({ attemptId }: { attemptId: string }) {
  const attempt = useStore((s) => s.attempts.find((a) => a.id === attemptId))
  const test = useStore((s) => (attempt ? s.tests.find((t) => t.id === attempt.testId) : undefined))
  const push = useStore((s) => s.push)
  const pop = useStore((s) => s.pop)
  const saveDraft = useStore((s) => s.saveDraft)
  const [showAll, setShowAll] = useState(false)
  const [confetti, setConfetti] = useState(false)

  const pct = attempt ? percent(attempt.score, attempt.total) : 0

  useEffect(() => {
    if (pct >= 80) {
      const t = setTimeout(() => setConfetti(true), 380)
      const t2 = setTimeout(() => setConfetti(false), 2200)
      return () => {
        clearTimeout(t)
        clearTimeout(t2)
      }
    }
  }, [pct])

  const detail = useMemo(() => {
    if (!attempt || !test) return null
    return scoreQuestions(test.pack, attempt.answers, attempt.questionNs)
  }, [attempt, test])

  if (!attempt) {
    return (
      <Page title="Result" back={pop}>
        <div className="empty">
          <div className="empty__title">Result not found</div>
          <button className="btn btn--primary btn--sm" onClick={() => push({ name: 'home' })}>
            Go home
          </button>
        </div>
      </Page>
    )
  }

  const t = tier(pct)
  const mistakes = detail?.results.filter((r) => !r.correct) ?? []
  const explainedCount = test ? test.pack.questions.filter((q) => q.explanation).length : 0
  const shown = showAll ? mistakes : mistakes.slice(0, 3)

  const retryWrong = () => {
    if (!test || !detail) return
    const ns = detail.results.filter((r) => !r.correct).map((r) => r.q.n)
    if (!ns.length) return
    saveDraft({
      testId: test.id,
      testName: test.name,
      answers: {},
      index: 0,
      questionNs: ns,
      startedAt: Date.now(),
      deadline: null,
      timed: false,
    })
    pop()
    push({ name: 'play', testId: test.id })
  }

  return (
    <>
      <Page
        title="Result"
        subtitle={test?.name ?? attempt.testName}
        back={() => {
          if (test) pop()
          else {
            pop()
            push({ name: 'home' })
          }
        }}
      >
        <div style={{ position: 'relative' }}>
          <Confetti show={confetti} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', paddingTop: 12 }}
          >
            <div className="label" style={{ color: 'var(--ink-3)' }}>
              {attempt.timeUp ? 'Time’s up' : attempt.timed ? 'Timed attempt' : 'Test complete'}
            </div>
            <div style={{ marginTop: 18 }}>
              <ScoreRing
                value={attempt.score}
                total={attempt.total}
                tone={pct >= 75 ? 'good' : pct < 40 ? 'bad' : 'brand'}
                label={`${attempt.score} of ${attempt.total} correct`}
              />
            </div>
            <h1 className="display" style={{ fontSize: 30, marginTop: 18 }}>
              {t.title}
            </h1>
            <p className="subtitle" style={{ marginTop: 6, fontSize: 14 }}>
              {t.sub}
            </p>
          </motion.div>
        </div>

        <div className="result-stats">
          <div className="result-stat result-stat--good">
            <div className="result-stat__v">{detail?.correct ?? attempt.score}</div>
            <div className="result-stat__l">Correct</div>
          </div>
          <div className="result-stat result-stat--bad">
            <div className="result-stat__v">{detail?.wrong ?? attempt.total - attempt.score}</div>
            <div className="result-stat__l">Wrong</div>
          </div>
          <div className="result-stat">
            <div className="result-stat__v">{detail?.unanswered ?? 0}</div>
            <div className="result-stat__l">Skipped</div>
          </div>
        </div>

        <div className="row gap-4" style={{ justifyContent: 'center', marginTop: 12, color: 'var(--ink-3)', fontSize: 12.5 }}>
          <span className="row gap-1">
            <Clock style={{ width: 14, height: 14 }} /> {formatDuration(attempt.durationMs)}
          </span>
          <span className="row gap-1">
            <Target style={{ width: 14, height: 14 }} /> {attempt.marked}/{attempt.total} answered
          </span>
        </div>

        <div className="stack gap-3" style={{ marginTop: 22 }}>
          {explainedCount > 0 && test && (
            <button
              className="btn btn--primary btn--lg btn--block"
              onClick={() => push({ name: 'review', testId: test.id, attemptId: attempt.id })}
            >
              <BookOpen /> Show explanation
            </button>
          )}
          {mistakes.length > 0 && test && (
            <button className="btn btn--secondary btn--block" onClick={retryWrong}>
              <Refresh /> Retry {mistakes.length} wrong question{mistakes.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            className="btn btn--ghost btn--block"
            onClick={() => {
              pop()
              if (!test) push({ name: 'home' })
            }}
          >
            Done
          </button>
        </div>

        {!test && (
          <div className="card" style={{ marginTop: 18 }}>
            <p className="subtitle" style={{ fontSize: 13.5 }}>
              This test was deleted from your library, so question-level review isn’t available. Your score stays in History.
            </p>
          </div>
        )}

        {mistakes.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="label">Where you lost marks</span>
              <span className="badge">{mistakes.length}</span>
            </div>
            <div className="stack gap-3">
              {shown.map((r) => (
                <div key={r.q.n} className={cn('review-card', 'review-card--wrong')}>
                  <div className="row-between">
                    <span className="q-number">Q{r.q.n}</span>
                    {!r.answered ? <span className="badge badge--warn">skipped</span> : <span className="badge badge--bad"><X /> your answer</span>}
                  </div>
                  <div className="review-q">
                    <MathText text={r.q.question} />
                  </div>
                  <div className="review-opts">
                    {r.q.options.map((o) => {
                      const isCorrect = r.q.answer.includes(o.key)
                      const isPicked = r.picked.includes(o.key)
                      return (
                        <div
                          key={o.key}
                          className={cn(
                            'review-opt',
                            isCorrect && 'review-opt--correct',
                            isPicked && !isCorrect && 'review-opt--picked-wrong',
                          )}
                        >
                          <b>{o.key}</b>
                          <span className="grow">
                            <MathText text={o.text} />
                          </span>
                          {isCorrect && <span style={{ color: 'var(--success)' }}><CheckCircle style={{ width: 15, height: 15 }} /></span>}
                          {isPicked && !isCorrect && <span style={{ color: 'var(--danger)' }}><X style={{ width: 15, height: 15 }} /></span>}
                        </div>
                      )
                    })}
                  </div>
                  {r.q.explanation && (
                    <div className="explain">
                      <div className="explain__label">Why</div>
                      <MathText text={r.q.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {mistakes.length > 3 && (
              <button className="btn btn--ghost btn--block" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>
                <ChevronDown style={{ width: 16, height: 16, transform: showAll ? 'rotate(180deg)' : 'none' }} />
                {showAll ? 'Show fewer' : `Show all ${mistakes.length} mistakes`}
              </button>
            )}
          </div>
        )}

        {mistakes.length === 0 && (
          <motion.div
            className="card card--hero"
            style={{ marginTop: 24, textAlign: 'center' }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Sparkles style={{ width: 26, height: 26, color: 'var(--accent)' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginTop: 6 }}>
              Every question correct
            </div>
            <p className="subtitle" style={{ fontSize: 13.5, marginTop: 4 }}>
              Nothing to review — try a timed attempt or a new test.
            </p>
          </motion.div>
        )}
      </Page>
    </>
  )
}
