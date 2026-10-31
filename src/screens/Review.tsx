import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { scoreQuestions, percent } from '../lib/scoring'
import { Page, EmptyState } from '../components/ui'
import { BookOpen, CheckCircle, X, ChevronDown } from '../components/Icons'
import { MathText } from '../components/MathText'
import { cn } from '../lib/cn'

type Filter = 'all' | 'wrong' | 'unanswered' | 'correct'

export function Review({ testId, attemptId }: { testId: string; attemptId?: string }) {
  const test = useStore((s) => s.tests.find((t) => t.id === testId))
  const attempt = useStore((s) => (attemptId ? s.attempts.find((a) => a.id === attemptId) : undefined))
  const pop = useStore((s) => s.pop)
  const push = useStore((s) => s.push)
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Set<number>>(new Set())

  const detail = useMemo(() => {
    if (!test) return null
    return scoreQuestions(test.pack, attempt?.answers ?? {}, attempt?.questionNs)
  }, [test, attempt])

  if (!test || !detail) {
    return (
      <Page title="Explanations" back={pop}>
        <EmptyState icon={<BookOpen />} title="Test not found" text="This test is no longer in your library." />
      </Page>
    )
  }

  const all = detail.results
  const wrong = all.filter((r) => !r.correct && r.answered)
  const skipped = all.filter((r) => !r.answered)
  const correct = all.filter((r) => r.correct)

  const list =
    filter === 'wrong' ? wrong : filter === 'unanswered' ? skipped : filter === 'correct' ? correct : all

  const toggle = (n: number) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: all.length },
    { id: 'wrong', label: 'Wrong', count: wrong.length },
    { id: 'unanswered', label: 'Skipped', count: skipped.length },
    { id: 'correct', label: 'Correct', count: correct.length },
  ]

  return (
    <Page
      title="Explanations"
      subtitle={attempt ? `${test.name} · ${percent(attempt.score, attempt.total)}%` : test.name}
      back={pop}
      right={
        <button className="pill-btn" onClick={() => push({ name: 'test', testId })}>
          Test
        </button>
      }
    >
      <div className="chip-scroll" style={{ marginBottom: 14 }}>
        {filters.map((f) => (
          <button key={f.id} className={cn('chip', filter === f.id && 'chip--active')} onClick={() => setFilter(f.id)}>
            {f.label}
            <span className="chip__count">{f.count}</span>
          </button>
        ))}
      </div>

      {!list.length ? (
        <EmptyState icon={<BookOpen />} title="Nothing here" text="No questions match this filter." />
      ) : (
        <div className="stack gap-3">
          {list.map((r) => {
            const expanded = open.has(r.q.n)
            const explanation = r.q.explanation
            return (
              <div
                key={r.q.n}
                className={cn('review-card', r.correct ? 'review-card--right' : r.answered ? 'review-card--wrong' : '')}
              >
                <div className="row-between">
                  <span className="q-number">Q{r.q.n}</span>
                  {!attempt ? (
                    <span className="badge">answer key</span>
                  ) : r.correct ? (
                    <span className="badge badge--good">
                      <CheckCircle /> correct
                    </span>
                  ) : r.answered ? (
                    <span className="badge badge--bad">
                      <X /> wrong
                    </span>
                  ) : (
                    <span className="badge badge--warn">skipped</span>
                  )}
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
                {explanation ? (
                  expanded || r.correct === false ? (
                    <div className="explain">
                      <div className="explain__label">Explanation</div>
                      <MathText text={explanation} />
                    </div>
                  ) : (
                    <button className="btn btn--ghost btn--sm" style={{ marginTop: 6, paddingInline: 0 }} onClick={() => toggle(r.q.n)}>
                      <ChevronDown style={{ width: 15, height: 15 }} /> Show explanation
                    </button>
                  )
                ) : (
                  <p className="subtitle" style={{ fontSize: 12.5, marginTop: 10 }}>
                    No explanation was included for this question.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
