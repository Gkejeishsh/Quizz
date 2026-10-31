import { describe, expect, it } from 'vitest'
import { dayGroup, formatClock, formatDuration, groupByDay } from '../dates'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h, 0, 0).getTime()

describe('dayGroup', () => {
  const now = at(2026, 9, 31, 18)

  it('groups today, yesterday and older', () => {
    expect(dayGroup(at(2026, 9, 31, 9), now)).toBe('Today')
    expect(dayGroup(at(2026, 9, 30, 23), now)).toBe('Yesterday')
    expect(dayGroup(at(2026, 9, 27, 10), now)).toBe('Last 7 days')
    expect(dayGroup(at(2026, 9, 10, 10), now)).toBe('This month')
    expect(dayGroup(at(2026, 6, 1, 10), now)).toBe('Earlier')
  })

  it('treats midnight as the boundary', () => {
    expect(dayGroup(at(2026, 9, 31, 0), now)).toBe('Today')
    expect(dayGroup(at(2026, 9, 30, 0), now)).toBe('Yesterday')
  })
})

describe('groupByDay', () => {
  it('keeps a stable group order', () => {
    const now = at(2026, 9, 31, 18)
    const items = [
      { id: 'a', ts: at(2026, 6, 2) },
      { id: 'b', ts: at(2026, 9, 31, 11) },
      { id: 'c', ts: at(2026, 9, 30, 11) },
    ]
    const groups = groupByDay(items, (i) => i.ts, now)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(groups[0].items[0].id).toBe('b')
  })
})

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(45_000)).toBe('45s')
    expect(formatDuration(125_000)).toBe('2m 05s')
    expect(formatDuration(3_725_000)).toBe('1h 2m')
  })

  it('formats a countdown clock', () => {
    expect(formatClock(59_000)).toBe('0:59')
    expect(formatClock(61_000)).toBe('1:01')
    expect(formatClock(-500)).toBe('0:00')
  })
})
