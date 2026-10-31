import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useStore, categoryById } from '../lib/store'
import { groupByDay } from '../lib/dates'
import { Page, EmptyState } from '../components/ui'
import { Grid, Search, Target, X, Plus } from '../components/Icons'
import { TestRow } from '../components/TestRow'
import { useTestActions } from '../components/TestActions'
import { cn } from '../lib/cn'

export function Library() {
  const tests = useStore((s) => s.tests)
  const categories = useStore((s) => s.categories)
  const attempts = useStore((s) => s.attempts)
  const push = useStore((s) => s.push)
  const pop = useStore((s) => s.pop)

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const actions = useTestActions()

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tests) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    return map
  }, [tests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tests
      .filter((t) => (activeCategory === 'all' ? true : t.categoryId === activeCategory))
      .filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.savedDate - a.savedDate)
  }, [tests, activeCategory, search])

  const groups = groupByDay(filtered, (t) => t.savedDate)

  return (
    <>
      <Page
        title="Saved tests"
        subtitle={`${tests.length} test${tests.length === 1 ? '' : 's'} · newest first`}
        back={pop}
        right={
          <div className="row gap-1">
            <button className="icon-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Search tests">
              {searchOpen ? <X /> : <Search />}
            </button>
            <button className="icon-btn" onClick={() => push({ name: 'categories' })} aria-label="Manage categories">
              <Target />
            </button>
          </div>
        }
      >
        {searchOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 12 }}>
            <input
              className="input"
              placeholder="Search saved tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </motion.div>
        )}

        <div className="chip-scroll" style={{ marginBottom: 4 }}>
          <button className={cn('chip', activeCategory === 'all' && 'chip--active')} onClick={() => setActiveCategory('all')}>
            <Grid style={{ width: 15, height: 15 }} />
            All
            <span className="chip__count">{tests.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={cn('chip', activeCategory === c.id && 'chip--active')}
              onClick={() => setActiveCategory(c.id)}
            >
              <span className="chip__dot" style={{ background: c.color }} />
              {c.name}
              <span className="chip__count">{counts.get(c.id) ?? 0}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={activeCategory === 'all' && !search ? <Grid /> : <Search />}
            title={search || activeCategory !== 'all' ? 'Nothing matches' : 'No saved tests yet'}
            text={
              search || activeCategory !== 'all'
                ? 'Try another category or clear the search.'
                : 'Add a test file from “Add new test” and it will show up here, sorted by the date you saved it.'
            }
            action={
              <button className="btn btn--primary btn--sm" onClick={() => push({ name: 'import' })}>
                <Plus style={{ width: 16, height: 16 }} /> Add a test
              </button>
            }
          />
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="group-label">{group.label}</div>
              <div className="list">
                {group.items.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.2), duration: 0.28 }}
                  >
                    <TestRow
                      test={t}
                      category={categoryById(categories, t.categoryId)}
                      attempts={attempts}
                      onClick={() => push({ name: 'test', testId: t.id })}
                      onMenu={() => actions.open(t)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="row gap-2" style={{ marginTop: 24, justifyContent: 'center' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => push({ name: 'import' })}>
            <Plus style={{ width: 16, height: 16 }} /> Add new test
          </button>
        </div>
      </Page>
      {actions.sheet}
    </>
  )
}
