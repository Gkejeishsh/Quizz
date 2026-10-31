import { memo } from 'react'
import type { Attempt, Category, TestRecord } from '../lib/types'
import { percent } from '../lib/scoring'
import { bestAttempts } from '../lib/store'
import { Dots } from './Icons'

export const TestRow = memo(function TestRow({
  test,
  category,
  attempts,
  onClick,
  onMenu,
  showCategory = true,
}: {
  test: TestRecord
  category: Category
  attempts: Attempt[]
  onClick: () => void
  onMenu?: () => void
  showCategory?: boolean
}) {
  const best = bestAttempts(attempts, test.id)
  const bestPct = best ? percent(best.score, best.total) : null

  return (
    <div className="list-row" style={{ padding: 0 }}>
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flex: 1,
          minWidth: 0,
          padding: '14px 16px',
          textAlign: 'left',
          background: 'transparent',
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `color-mix(in srgb, ${category.color} 16%, transparent)`,
            color: category.color,
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          {test.questionCount}
        </span>
        <span className="list-row__main">
          <span className="list-row__title" style={{ display: 'block' }}>
            {test.name}
          </span>
          <span className="list-row__meta">
            {showCategory && <span className="dot" style={{ background: category.color }} />}
            {showCategory && <span>{category.name}</span>}
            <span className="sep">·</span>
            <span>{test.questionCount} questions</span>
            {bestPct !== null && (
              <>
                <span className="sep">·</span>
                <span style={{ color: bestPct >= 80 ? 'var(--success)' : bestPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                  best {bestPct}%
                </span>
              </>
            )}
          </span>
        </span>
      </button>
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label={`Actions for ${test.name}`}
          className="icon-btn"
          style={{ marginRight: 6 }}
        >
          <Dots />
        </button>
      )}
    </div>
  )
})
