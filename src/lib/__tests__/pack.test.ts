import { describe, expect, it } from 'vitest'
import { validatePack } from '../pack'
import { DEMO_PACKS } from '../../data/demoPacks'

const baseQuestion = {
  n: 1,
  type: 'single',
  question: 'What is 2 + 2?',
  options: [
    { key: 'A', text: '3' },
    { key: 'B', text: '4' },
    { key: 'C', text: '5' },
    { key: 'D', text: '6' },
  ],
  answer: ['B'],
  explanation: 'Two plus two is four.',
}

function pack(overrides: Record<string, unknown> = {}) {
  return {
    format: 'quizz-pack',
    formatVersion: 1,
    id: 'pck_test_0001',
    title: 'Test pack',
    createdAt: new Date().toISOString(),
    questions: [baseQuestion],
    ...overrides,
  }
}

describe('validatePack', () => {
  it('accepts a valid pack', () => {
    const result = validatePack(pack())
    expect(result.ok).toBe(true)
    expect(result.pack?.questions).toHaveLength(1)
    expect(result.summary).toMatchObject({ questions: 1, answered: 1, explained: 1, warnings: 0 })
  })

  it('rejects a non-quizz file', () => {
    const result = validatePack({ hello: 'world' })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.level === 'error')).toBe(true)
  })

  it('rejects an empty question list', () => {
    const result = validatePack(pack({ questions: [] }))
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate question numbers', () => {
    const result = validatePack(
      pack({
        questions: [baseQuestion, { ...baseQuestion, question: 'Other?' }],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.message.includes('Duplicate question number'))).toBe(true)
  })

  it('rejects an answer key that points at a missing option', () => {
    const result = validatePack(pack({ questions: [{ ...baseQuestion, answer: ['E'] }] }))
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.message.includes('does not exist'))).toBe(true)
  })

  it('rejects a single-choice question with two answers', () => {
    const result = validatePack(pack({ questions: [{ ...baseQuestion, answer: ['A', 'B'] }] }))
    expect(result.ok).toBe(false)
  })

  it('rejects unclosed math', () => {
    const result = validatePack(pack({ questions: [{ ...baseQuestion, question: 'Solve $x+1' }] }))
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.message.includes('unclosed equation'))).toBe(true)
  })

  it('allows a pack with no explanations but warns', () => {
    const result = validatePack(pack({ questions: [{ ...baseQuestion, explanation: '' }] }))
    expect(result.ok).toBe(true)
    expect(result.issues.some((i) => i.level === 'warning')).toBe(true)
  })

  it('sorts questions by their printed number and keeps the numbers', () => {
    const result = validatePack(
      pack({
        questions: [
          { ...baseQuestion, n: 3, question: 'Third?' },
          { ...baseQuestion, n: 1, question: 'First?' },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.pack?.questions.map((q) => q.n)).toEqual([1, 3])
  })

  it('rejects files over the size limit', () => {
    const result = validatePack(pack(), 13 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })
})

describe('bundled demo packs', () => {
  for (const demo of DEMO_PACKS) {
    it(`${demo.id} is valid`, () => {
      const result = validatePack(demo)
      const errors = result.issues.filter((i) => i.level === 'error')
      expect(errors, JSON.stringify(errors)).toHaveLength(0)
      expect(result.ok).toBe(true)
      expect(result.pack?.questions.length).toBe(demo.questions.length)
    })
  }
})
