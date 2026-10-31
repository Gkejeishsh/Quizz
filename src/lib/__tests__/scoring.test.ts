import { describe, expect, it } from 'vitest'
import { isCorrect, percent, scoreQuestions } from '../scoring'
import type { Pack } from '../types'

const q = (n: number, answer: string[], type: 'single' | 'multi' = 'single') => ({
  n,
  type,
  question: `Question ${n}`,
  options: [
    { key: 'A', text: 'a' },
    { key: 'B', text: 'b' },
    { key: 'C', text: 'c' },
  ],
  answer,
  explanation: 'because',
})

const pack: Pack = {
  format: 'quizz-pack',
  formatVersion: 1,
  id: 'pck_scoring_1',
  title: 'Scoring',
  createdAt: new Date().toISOString(),
  questions: [q(1, ['A']), q(2, ['B']), q(3, ['C']), q(4, ['A', 'C'], 'multi')],
}

describe('isCorrect', () => {
  it('matches single answers exactly', () => {
    expect(isCorrect(pack.questions[0], ['A'])).toBe(true)
    expect(isCorrect(pack.questions[0], ['B'])).toBe(false)
    expect(isCorrect(pack.questions[0], [])).toBe(false)
    expect(isCorrect(pack.questions[0], undefined)).toBe(false)
  })

  it('matches multi answers regardless of order', () => {
    expect(isCorrect(pack.questions[3], ['C', 'A'])).toBe(true)
    expect(isCorrect(pack.questions[3], ['A'])).toBe(false)
    expect(isCorrect(pack.questions[3], ['A', 'C', 'B'])).toBe(false)
  })
})

describe('scoreQuestions', () => {
  it('scores a perfect attempt', () => {
    const r = scoreQuestions(pack, { '1': ['A'], '2': ['B'], '3': ['C'], '4': ['A', 'C'] })
    expect(r).toMatchObject({ score: 4, total: 4, correct: 4, wrong: 0, unanswered: 0, marked: 4 })
    expect(percent(r.score, r.total)).toBe(100)
  })

  it('separates wrong from unanswered', () => {
    const r = scoreQuestions(pack, { '1': ['A'], '2': ['C'] })
    expect(r.score).toBe(1)
    expect(r.wrong).toBe(1)
    expect(r.unanswered).toBe(2)
    expect(r.marked).toBe(2)
  })

  it('respects a question subset (retry wrong only)', () => {
    const r = scoreQuestions(pack, { '2': ['B'], '3': ['A'] }, [2, 3])
    expect(r.total).toBe(2)
    expect(r.score).toBe(1)
    expect(r.results.map((x) => x.q.n)).toEqual([2, 3])
  })

  it('never divides by zero', () => {
    expect(percent(0, 0)).toBe(0)
  })
})
