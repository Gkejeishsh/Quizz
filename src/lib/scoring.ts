import type { Answers, Pack, PackQuestion } from './types'

export function normalizeAnswer(answer: string[] | undefined): string {
  return [...(answer ?? [])].sort().join('')
}

export function isCorrect(q: PackQuestion, answer: string[] | undefined): boolean {
  if (!answer || answer.length === 0) return false
  return normalizeAnswer(answer) === normalizeAnswer(q.answer)
}

export type QuestionResult = {
  q: PackQuestion
  picked: string[]
  correct: boolean
  answered: boolean
}

export type ScoreResult = {
  results: QuestionResult[]
  score: number
  total: number
  marked: number
  correct: number
  wrong: number
  unanswered: number
}

export function scoreQuestions(
  pack: Pack,
  answers: Answers,
  questionNs?: number[],
): ScoreResult {
  const ns = questionNs && questionNs.length ? questionNs : pack.questions.map((q) => q.n)
  const byNumber = new Map(pack.questions.map((q) => [q.n, q]))
  const results: QuestionResult[] = []
  for (const n of ns) {
    const q = byNumber.get(n)
    if (!q) continue
    const picked = answers[String(n)] ?? []
    results.push({ q, picked, correct: isCorrect(q, picked), answered: picked.length > 0 })
  }
  const total = results.length
  const correct = results.filter((r) => r.correct).length
  const unanswered = results.filter((r) => !r.answered).length
  const wrong = total - correct - unanswered
  return {
    results,
    score: correct,
    total,
    marked: results.filter((r) => r.answered).length,
    correct,
    wrong,
    unanswered,
  }
}

export function percent(score: number, total: number): number {
  if (!total) return 0
  return Math.round((score / total) * 100)
}
