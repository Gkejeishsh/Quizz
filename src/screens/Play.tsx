import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore, uid } from '../lib/store'
import { scoreQuestions } from '../lib/scoring'
import { formatClock } from '../lib/dates'
import { MathText } from '../components/MathText'
import { Sheet } from '../components/ui'
import { ArrowLeft, Check, Clock, Flag, X } from '../components/Icons'
import { haptic } from '../lib/haptics'
import { cn } from '../lib/cn'
import { SPRING_SETTLE } from '../components/ui'

export function Play({ testId }: { testId: string }) {
  const test = useStore((s) => s.tests.find((t) => t.id === testId))
  const draft = useStore((s) => s.drafts.find((d) => d.testId === testId))
  const saveDraft = useStore((s) => s.saveDraft)
  const clearDraft = useStore((s) => s.clearDraft)
  const pop = useStore((s) => s.pop)
  const push = useStore((s) => s.push)
  const toast = useStore((s) => s.toast)
  const haptics = useStore((s) => s.settings.haptics)

  const reduce = useReducedMotion()
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => ({ ...(draft?.answers ?? {}) }))
  const [flags, setFlags] = useState<number[]>(() => draft?.flags ?? [])
  const [index, setIndex] = useState(() => Math.min(draft?.index ?? 0, Math.max(0, (draft?.questionNs.length ?? 1) - 1)))
  const [dir, setDir] = useState(1)
  const [exitOpen, setExitOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)
  const finishedRef = useRef(false)
  const lock = useRef(false)
  const advanceTimer = useRef<number | null>(null)

  const questionNs = useMemo(() => draft?.questionNs ?? test?.pack.questions.map((q) => q.n) ?? [], [draft, test])
  const byNumber = useMemo(() => new Map(test?.pack.questions.map((q) => [q.n, q]) ?? []), [test])
  const q = byNumber.get(questionNs[index])

  const answersRef = useRef(answers)
  answersRef.current = answers
  const indexRef = useRef(index)
  indexRef.current = index

  const deadline = draft?.deadline ?? null

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [deadline])

  const finish = useCallback(
    (timeUp = false) => {
      if (finishedRef.current) return
      finishedRef.current = true
      if (advanceTimer.current) {
        window.clearTimeout(advanceTimer.current)
        advanceTimer.current = null
      }
      lock.current = false
      setFinished(true)
      const store = useStore.getState()
      const currentTest = store.tests.find((t) => t.id === testId)
      const d = store.drafts.find((x) => x.testId === testId)
      if (!currentTest) {
        pop()
        return
      }
      const ns = d?.questionNs ?? currentTest.pack.questions.map((x) => x.n)
      const result = scoreQuestions(currentTest.pack, answersRef.current, ns)
      const finishedAt = Date.now()
      const attemptId = uid('att')
      store.submitAttempt({
        id: attemptId,
        testId: currentTest.id,
        testName: currentTest.name,
        categoryId: currentTest.categoryId,
        startedAt: d?.startedAt ?? finishedAt,
        finishedAt,
        durationMs: finishedAt - (d?.startedAt ?? finishedAt),
        answers: answersRef.current,
        questionNs: ns,
        score: result.score,
        total: result.total,
        marked: result.marked,
        mode: ns.length < currentTest.pack.questions.length ? 'wrong-only' : 'full',
        timed: !!d?.deadline,
        timeUp,
        flags: d?.flags ?? [],
      })
      if (timeUp) {
        toast('Time’s up — your answers are saved', 'neutral')
        haptic('warning')
      } else {
        haptic('success')
      }
      pop()
      push({ name: 'results', attemptId })
    },
    [pop, push, testId, toast],
  )

  useEffect(() => {
    if (!deadline || finished) return
    if (now >= deadline) finish(true)
  }, [now, deadline, finished, finish])

  useEffect(() => () => clearAdvance(), [])

  useEffect(() => {
    const onExit = () => setExitOpen(true)
    window.addEventListener('quizz:exit-request', onExit)
    return () => window.removeEventListener('quizz:exit-request', onExit)
  }, [])

  if (!test || !q) {
    return (
      <div className="screen">
        <div className="empty" style={{ marginTop: 80 }}>
          <div className="empty__title">This test isn’t available</div>
          <p className="empty__text">It may have been deleted while the quiz was open.</p>
          <button className="btn btn--primary btn--sm" onClick={pop}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  const total = questionNs.length
  const picked = answers[String(q.n)] ?? []
  const isMulti = q.type === 'multi'
  const progress = ((index + (picked.length ? 1 : 0)) / Math.max(1, total)) * 100
  const remaining = deadline ? deadline - now : null
  const timerTone = remaining === null ? '' : remaining < 60_000 ? 'timer-chip--danger' : remaining < 300_000 ? 'timer-chip--warn' : ''
  const group = q.group ? test.pack.groups?.find((g) => g.id === q.group) : undefined
  const isFlagged = flags.includes(q.n)

  const persist = (nextAnswers: Record<string, string[]>, nextIndex: number, nextFlags = flags) => {
    saveDraft({
      testId: test.id,
      testName: test.name,
      answers: nextAnswers,
      index: nextIndex,
      questionNs,
      startedAt: draft?.startedAt ?? Date.now(),
      deadline,
      timed: !!deadline,
      flags: nextFlags,
    })
  }

  const toggleFlag = () => {
    haptic('light')
    setFlags((prev) => {
      const next = prev.includes(q?.n ?? -1) ? prev.filter((n) => n !== q?.n) : [...prev, q!.n]
      persist(answersRef.current, indexRef.current, next)
      return next
    })
  }

  const clearAdvance = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    lock.current = false
  }

  const unansweredCount = () => questionNs.filter((n) => (answersRef.current[String(n)] ?? []).length === 0).length

  const requestFinish = () => {
    if (finishedRef.current) return
    clearAdvance()
    if (unansweredCount() > 0) {
      setFinishOpen(true)
      return
    }
    finish(false)
  }

  const goNext = () => {
    if (finishedRef.current) return
    clearAdvance()
    if (index >= total - 1) {
      requestFinish()
      return
    }
    setDir(1)
    setIndex((i) => i + 1)
    persist(answersRef.current, index + 1)
  }

  const goPrev = () => {
    if (finishedRef.current) return
    clearAdvance()
    if (index === 0) return
    setDir(-1)
    setIndex((i) => i - 1)
    persist(answersRef.current, index - 1)
  }

  const pick = (key: string) => {
    if (lock.current) return
    haptic('light')
    let next: string[]
    if (isMulti) {
      next = picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]
      const nextAnswers = { ...answersRef.current, [String(q.n)]: next }
      answersRef.current = nextAnswers
      setAnswers(nextAnswers)
      persist(nextAnswers, index)
      return
    }
    next = [key]
    const nextAnswers = { ...answersRef.current, [String(q.n)]: next }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    persist(nextAnswers, index)
    clearAdvance()
    lock.current = true
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      lock.current = false
      if (finishedRef.current) return
      if (indexRef.current >= total - 1) finish(false)
      else goNext()
    }, haptics ? 220 : 160)
  }

  return (
    <div className="screen">
      <div className="quiz-top">
        <button className="icon-btn" onClick={() => setExitOpen(true)} aria-label="Exit test">
          <X />
        </button>
        <div className="grow">
          <div className="quiz-counter" aria-live="polite">
            <b>{String(index + 1).padStart(2, '0')}</b> / {total}
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={toggleFlag}
          aria-label={isFlagged ? 'Remove flag' : 'Flag this question'}
          aria-pressed={isFlagged}
          style={{ color: isFlagged ? 'var(--warning)' : undefined }}
        >
          <Flag style={{ fill: isFlagged ? 'currentColor' : 'none' }} />
        </button>
        {remaining !== null && (
          <div className={cn('timer-chip', timerTone)}>
            <Clock />
            {formatClock(remaining)}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div className="progress progress--slim">
          <motion.div
            className="progress__fill"
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
            style={{ width: 0 }}
          />
        </div>
      </div>

      <div className="screen-body grow" style={{ paddingTop: 8 }}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={q.n}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -22 }}
            transition={SPRING_SETTLE}
            className="q-wrap"
            style={{ paddingInline: 0 }}
          >
            {group && (
              <div className="card" style={{ marginBottom: 16, background: 'var(--surface-2)' }}>
                {group.title && <div className="label" style={{ marginBottom: 6 }}>{group.title}</div>}
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                  <MathText text={group.text} />
                </div>
              </div>
            )}

            <div className="row gap-2 wrap">
              <span className="q-number">Q{q.n}</span>
              {q.difficulty && q.difficulty !== 'medium' && (
                <span className={cn('badge', q.difficulty === 'easy' ? 'badge--good' : 'badge--warn')}>{q.difficulty}</span>
              )}
              {isMulti && <span className="badge">select all that apply</span>}
            </div>

            <h2 className="q-text">
              <MathText text={q.question} />
            </h2>

            <div className="options" role="group" aria-label={`Question ${q.n} options`}>
              {q.options.map((o) => {
                const isPicked = picked.includes(o.key)
                return (
                  <motion.button
                    key={o.key}
                    className={cn('option', isPicked && 'option--picked')}
                    onClick={() => pick(o.key)}
                    whileTap={reduce ? undefined : { scale: 0.985 }}
                    aria-pressed={isPicked}
                  >
                    <span className="option__key">{o.key}</span>
                    <span className="option__text">
                      <MathText text={o.text} />
                    </span>
                    {isPicked && (
                      <span className="option__flag" style={{ color: 'var(--primary)', opacity: 1 }}>
                        <Check />
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      <div className="quiz-footer">
        <div className="row gap-2">
          <button className="btn btn--soft" style={{ width: 92 }} onClick={goPrev} disabled={index === 0} aria-label="Previous question">
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <button className="btn btn--secondary grow" onClick={goNext}>
            {index === total - 1 ? 'Finish test' : picked.length ? 'Next' : 'Skip'}
          </button>
        </div>
      </div>

      <Sheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish the test?"
        desc={`${unansweredCount()} question${unansweredCount() === 1 ? '' : 's'} still unanswered. They will be marked wrong, and you can still read the explanations afterwards.`}
      >
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            setFinishOpen(false)
            finish(false)
          }}
        >
          Finish and see my score
        </button>
        <button className="btn btn--soft btn--block" onClick={() => setFinishOpen(false)}>
          Keep going
        </button>
      </Sheet>

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="Leave the test?">
        <p className="sheet__desc" style={{ marginTop: 0 }}>
          Your answers are saved on this device. You can continue later from the test page.
        </p>
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            // the timer belongs to this attempt only: leaving discards it,
            // but the answers stay so the test can be resumed later
            saveDraft({
              testId: test.id,
              testName: test.name,
              answers: answersRef.current,
              index: indexRef.current,
              questionNs,
              startedAt: draft?.startedAt ?? Date.now(),
              deadline: null,
              timed: false,
              flags,
            })
            setExitOpen(false)
            pop()
          }}
        >
          Save & exit
        </button>
        <button
          className="btn btn--danger btn--block"
          onClick={() => {
            clearDraft(test.id)
            setExitOpen(false)
            pop()
            toast('Attempt discarded')
          }}
        >
          Discard this attempt
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => setExitOpen(false)}>
          Keep going
        </button>
      </Sheet>
    </div>
  )
}
