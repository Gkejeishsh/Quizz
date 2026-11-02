import { motion } from 'motion/react'
import { useStore, applyTheme, categoryById } from '../lib/store'
import { useCountUp } from '../components/ui'
import { Logo } from '../components/Logo'
import { Grid, History, Moon, Plus, Settings, Sun, ArrowRight, Play, Sparkles, Target } from '../components/Icons'
import { percent } from '../lib/scoring'
import { TestRow } from '../components/TestRow'
import { haptic } from '../lib/haptics'

export function Home() {
  const tests = useStore((s) => s.tests)
  const attempts = useStore((s) => s.attempts)
  const drafts = useStore((s) => s.drafts)
  const categories = useStore((s) => s.categories)
  const push = useStore((s) => s.push)
  const setSetting = useStore((s) => s.setSetting)

  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  const bestOverall = attempts.length
    ? Math.max(...attempts.map((a) => percent(a.score, a.total)))
    : 0
  const attemptsCount = attempts.length
  const draft = drafts[0]
  const draftTest = draft ? tests.find((t) => t.id === draft.testId) : undefined

  const [testsCount] = useCountUp(tests.length, 500)
  const [attemptsShown] = useCountUp(attemptsCount, 500)
  const [bestShown] = useCountUp(bestOverall, 700)

  const toggleTheme = () => {
    haptic('light')
    const next = theme === 'dark' ? 'light' : 'dark'
    setSetting('theme', next)
    applyTheme(next)
  }

  const recent = tests.slice(0, 3)

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0' }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <Logo />
          <div className="row gap-2">
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <button className="pill-btn" onClick={() => push({ name: 'history' })}>
              <History />
              <span>History</span>
            </button>
          </div>
        </div>

      </div>

      <div className="screen-body" style={{ paddingTop: 18 }}>
        <div className="stack gap-3">
          <motion.button
            className="action-card action-card--primary"
            onClick={() => {
              haptic('medium')
              push({ name: 'import' })
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.42, ease: [0.05, 0.7, 0.1, 1] }}
          >
            <span className="action-card__icon">
              <Plus />
            </span>
            <span className="grow">
              <span className="action-card__title" style={{ display: 'block' }}>
                Add new test
              </span>
              <span className="action-card__sub" style={{ display: 'block' }}>
                Import a .quizz file
              </span>
            </span>
            <span className="action-card__chev">
              <ArrowRight />
            </span>
          </motion.button>

          <motion.button
            className="action-card"
            onClick={() => {
              haptic('light')
              push({ name: 'library' })
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.42, ease: [0.05, 0.7, 0.1, 1] }}
          >
            <span className="action-card__icon">
              <Grid />
            </span>
            <span className="grow">
              <span className="action-card__title" style={{ display: 'block' }}>
                Saved tests
              </span>
              <span className="action-card__sub" style={{ display: 'block' }}>
                {tests.length ? `${tests.length} saved · ${categories.length - 1} categories` : 'Nothing saved yet'}
              </span>
            </span>
            <span className="action-card__chev">
              <ArrowRight />
            </span>
          </motion.button>
        </div>

        {draft && draftTest && (
          <motion.button
            className="card card--hero"
            onClick={() => push({ name: 'play', testId: draftTest.id })}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.42 }}
            style={{ marginTop: 18, width: '100%', textAlign: 'left' }}
          >
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="row gap-2" style={{ color: 'var(--accent)' }}>
                <Play style={{ width: 14, height: 14 }} />
                <span className="label" style={{ color: 'var(--accent)' }}>
                  Continue
                </span>
              </span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Q{draft.index + 1} / {draft.questionNs.length}
              </span>
            </div>
            <div className="row-between gap-3">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 650, lineHeight: 1.3 }}>{draftTest.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>
                  {Object.keys(draft.answers).length} answered · saved automatically
                </div>
              </div>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <ArrowRight style={{ width: 18, height: 18 }} />
              </span>
            </div>
            <div className="progress progress--slim" style={{ marginTop: 14 }}>
              <div className="progress__fill" style={{ width: `${(draft.index / Math.max(1, draft.questionNs.length)) * 100}%` }} />
            </div>
          </motion.button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.42 }}
          style={{ marginTop: 18 }}
        >
          <div className="stat-strip">
            <div className="stat">
              <div className="stat__value">{testsCount}</div>
              <div className="stat__label">Tests</div>
            </div>
            <div className="stat">
              <div className="stat__value">{attemptsShown}</div>
              <div className="stat__label">Attempts</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {attemptsCount ? bestShown : '—'}
                {attemptsCount ? <span style={{ fontSize: 12, opacity: 0.55 }}>%</span> : null}
              </div>
              <div className="stat__label">Best</div>
            </div>
          </div>
        </motion.div>

        {recent.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="label">Recently saved</span>
              <button className="row gap-1" onClick={() => push({ name: 'library' })} style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--primary)' }}>
                See all <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div className="list">
              {recent.map((t) => (
                <TestRow
                  key={t.id}
                  test={t}
                  category={categoryById(categories, t.categoryId)}
                  attempts={attempts}
                  onClick={() => push({ name: 'test', testId: t.id })}
                />
              ))}
            </div>
          </div>
        )}

        {tests.length === 0 && (
          <div className="card" style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', color: 'var(--primary)', marginBottom: 8 }}>
              <Sparkles style={{ width: 28, height: 28 }} />
            </div>
            <div style={{ fontWeight: 650, fontSize: 15 }}>Your library is empty</div>
            <p className="subtitle" style={{ fontSize: 13.5, marginTop: 4 }}>
              Add a test file and it will appear here, ready to play offline.
            </p>
          </div>
        )}

        <div className="row gap-2" style={{ marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => push({ name: 'settings' })}>
            <Settings style={{ width: 16, height: 16 }} /> Settings
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => push({ name: 'categories' })}>
            <Target style={{ width: 16, height: 16 }} /> Categories
          </button>
        </div>
      </div>
    </div>
  )
}
