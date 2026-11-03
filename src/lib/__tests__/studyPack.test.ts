import { describe, expect, it } from 'vitest'
import type { Pack } from '../types'
import { hasArabic, isUrduBlock } from '../text'
import { validatePack } from '../pack'
import studyRaw from '../../../packs/hec-vocab-urdu-study.quizz?raw'

const pack = JSON.parse(studyRaw) as Pack

/**
 * The study drill is generated, so guard the things a generator can silently
 * break: valid schema, unique option keys, a real answer, a short Urdu block.
 */
describe('HEC vocabulary study drill', () => {
  it('passes the pack validator', () => {
    const result = validatePack(pack, studyRaw.length)
    expect(result.ok).toBe(true)
  })

  it('has 196 numbered questions with explanations', () => {
    expect(pack.questions).toHaveLength(196)
    pack.questions.forEach((q, i) => {
      expect(q.n).toBe(i + 1)
      expect(q.explanation?.trim().length ?? 0).toBeGreaterThan(0)
    })
  })

  it('never repeats an option and always answers with a real option', () => {
    for (const q of pack.questions) {
      const keys = q.options.map((o) => o.key)
      const texts = q.options.map((o) => o.text.trim().toLowerCase())
      expect(new Set(keys).size).toBe(keys.length)
      expect(new Set(texts).size).toBe(texts.length)
      expect(q.answer.length).toBe(1)
      expect(keys).toContain(q.answer[0])
      expect(texts).not.toContain('')
    }
  })

  it('keeps the Urdu meaning round playable right-to-left', () => {
    const urduRound = pack.questions.slice(0, 50)
    for (const q of urduRound) {
      const urduOptions = q.options.filter((o) => hasArabic(o.text))
      expect(urduOptions.length).toBe(q.options.length)
      // Pure Urdu options get the RTL container treatment in Play/Review.
      expect(urduOptions.every((o) => isUrduBlock(o.text))).toBe(true)
    }
    // Stems stay English so the “What does …” line reads left-to-right.
    expect(urduRound.every((q) => !isUrduBlock(q.question))).toBe(true)
  })
})
