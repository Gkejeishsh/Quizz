import type { Pack, PackQuestion } from './types'

export type ValidationIssue = {
  level: 'error' | 'warning'
  message: string
  n?: number
}

export type ValidationResult = {
  ok: boolean
  issues: ValidationIssue[]
  pack?: Pack
  summary?: {
    questions: number
    answered: number
    explained: number
    warnings: number
  }
}

const MAX_QUESTIONS = 500
const MAX_BYTES = 12 * 1024 * 1024
const KEY_RE = /^[A-F]$/

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown): v is string {
  return typeof v === 'string'
}

/** Count of unescaped $ delimiters — used to catch broken LaTeX. */
function balancedMath(text: string): boolean {
  const dollars = text.replace(/\\\$/g, '').match(/\$/g)
  return !dollars || dollars.length % 2 === 0
}

export function validatePack(raw: unknown, byteSize = 0): ValidationResult {
  const issues: ValidationIssue[] = []
  const err = (message: string, n?: number) => issues.push({ level: 'error', message, n })
  const warn = (message: string, n?: number) => issues.push({ level: 'warning', message, n })

  if (!isObj(raw)) {
    return { ok: false, issues: [{ level: 'error', message: 'This file is not a Quizz test file.' }] }
  }
  if (raw.format !== 'quizz-pack') {
    err('Not a Quizz file: the "format" field must be "quizz-pack".')
  }
  if (typeof raw.formatVersion !== 'number' || ![1].includes(raw.formatVersion)) {
    err('Unsupported format version. This version of Quizz reads version 1 files.')
  }
  if (!str(raw.id) || !/^pck_[A-Za-z0-9_-]{4,64}$/.test(raw.id)) {
    err('The pack id is missing or malformed (expected something like "pck_ab12cd").')
  }
  if (!str(raw.title) || raw.title.trim().length === 0) err('The test needs a title.')
  if (!str(raw.createdAt)) warn('No creation date in the file; today\'s date will be used.')

  const questionsRaw = raw.questions
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    err('This test has no questions.')
    return { ok: false, issues }
  }
  if (questionsRaw.length > MAX_QUESTIONS) {
    err(`Too many questions (${questionsRaw.length}). The limit is ${MAX_QUESTIONS}.`)
  }
  if (byteSize > MAX_BYTES) {
    err(`The file is too large (${(byteSize / 1024 / 1024).toFixed(1)} MB). The limit is 12 MB.`)
  }

  const seenNumbers = new Set<number>()
  let explained = 0
  let answered = 0

  const questions: PackQuestion[] = []

  questionsRaw.forEach((item, i) => {
    const label = `Question ${i + 1}`
    if (!isObj(item)) {
      err(`${label} is not an object.`)
      return
    }
    const n = item.n
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
      err(`${label} has an invalid question number.`)
      return
    }
    if (seenNumbers.has(n)) err(`Duplicate question number ${n}.`, n)
    seenNumbers.add(n)

    if (!str(item.question) || item.question.trim() === '') err(`Q${n} has empty question text.`, n)

    const optsRaw = item.options
    if (!Array.isArray(optsRaw) || optsRaw.length < 2 || optsRaw.length > 6) {
      err(`Q${n} must have between 2 and 6 options.`, n)
      return
    }
    const keys = new Set<string>()
    const texts = new Set<string>()
    for (const o of optsRaw) {
      if (!isObj(o) || !str(o.key) || !KEY_RE.test(o.key)) {
        err(`Q${n} has an option with an invalid label (must be A–F).`, n)
        continue
      }
      if (keys.has(o.key)) err(`Q${n} has two options labelled ${o.key}.`, n)
      keys.add(o.key)
      if (!str(o.text) || o.text.trim() === '') err(`Q${n} option ${o.key} is empty.`, n)
      else {
        const norm = o.text.trim().toLowerCase()
        if (texts.has(norm)) warn(`Q${n} has two identical options (${o.key}).`, n)
        texts.add(norm)
      }
    }

    const answersRaw = item.answer
    if (!Array.isArray(answersRaw) || answersRaw.length === 0) {
      err(`Q${n} has no answer key.`, n)
    } else {
      const bad = answersRaw.filter((a) => !str(a) || !keys.has(a))
      if (bad.length) {
        err(`Q${n}'s answer key points to option ${bad.join(', ')}, which does not exist.`, n)
      }
      const type = str(item.type) ? item.type : 'single'
      if (type === 'single' && answersRaw.length > 1) {
        err(`Q${n} is a single-choice question but has ${answersRaw.length} correct answers.`, n)
      }
      if (answersRaw.length > 0 && bad.length === 0) answered++
    }

    const explanation = str(item.explanation) ? item.explanation.trim() : ''
    if (explanation) explained++
    else warn(`Q${n} has no explanation.`, n)

    for (const field of ['question', 'explanation'] as const) {
      const v = item[field]
      if (str(v) && !balancedMath(v)) err(`Q${n} has an unclosed equation (odd number of $ signs).`, n)
    }
    for (const o of optsRaw) {
      if (isObj(o) && str(o.text) && !balancedMath(o.text)) {
        err(`Q${n} option ${String(o.key)} has an unclosed equation.`, n)
      }
    }

    questions.push({
      n,
      type: (str(item.type) ? item.type : 'single') as PackQuestion['type'],
      question: str(item.question) ? item.question : '',
      options: optsRaw
        .filter(isObj)
        .map((o) => ({
          key: str(o.key) ? o.key : 'A',
          text: str(o.text) ? o.text : '',
          asset: str(o.asset) ? o.asset : null,
        })),
      answer: Array.isArray(answersRaw) ? (answersRaw.filter(str) as string[]) : [],
      explanation,
      group: str(item.group) ? item.group : null,
      difficulty: item.difficulty === 'easy' || item.difficulty === 'hard' ? item.difficulty : 'medium',
      tags: Array.isArray(item.tags) ? item.tags.filter(str) : [],
      sourceRef: isObj(item.sourceRef)
        ? { page: Number(item.sourceRef.page) || undefined, block: str(item.sourceRef.block) ? item.sourceRef.block : undefined }
        : undefined,
    })
  })

  const sorted = [...questions].sort((a, b) => a.n - b.n)
  const gaps: number[] = []
  if (sorted.length > 1) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].n - sorted[i - 1].n > 1 && sorted[i - 1].n < sorted[i].n) {
        gaps.push(sorted[i - 1].n + 1)
      }
    }
  }
  if (gaps.length) warn(`Question numbering jumps (missing ${gaps.slice(0, 5).join(', ')}${gaps.length > 5 ? '…' : ''}).`)

  if (explained === 0) {
    warn('This test has no explanations, so "Show explanation" will be unavailable.')
  }

  const ok = !issues.some((i) => i.level === 'error')
  const pack: Pack | undefined = ok
    ? {
        format: 'quizz-pack',
        formatVersion: 1,
        id: raw.id as string,
        revision: typeof raw.revision === 'number' ? raw.revision : 1,
        supersedes: str(raw.supersedes) ? raw.supersedes : null,
        title: (raw.title as string).trim(),
        subject: str(raw.subject) ? raw.subject : undefined,
        language: str(raw.language) ? raw.language : 'en',
        createdAt: str(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
        instructions: str(raw.instructions) ? raw.instructions : undefined,
        durationMinutes: typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 0,
        source: isObj(raw.source)
          ? {
              fileName: str(raw.source.fileName) ? raw.source.fileName : undefined,
              pages: typeof raw.source.pages === 'number' ? raw.source.pages : undefined,
              generator: str(raw.source.generator) ? raw.source.generator : undefined,
              checksum: str(raw.source.checksum) ? raw.source.checksum : undefined,
            }
          : undefined,
        groups: Array.isArray(raw.groups) ? (raw.groups as Pack['groups']) : [],
        questions: sorted,
        assets: isObj(raw.assets) ? (raw.assets as Pack['assets']) : {},
      }
    : undefined

  return {
    ok,
    issues,
    pack,
    summary: {
      questions: questions.length,
      answered,
      explained,
      warnings: issues.filter((i) => i.level === 'warning').length,
    },
  }
}

export function defaultTestName(pack: Pack): string {
  return pack.title.trim() || 'Untitled test'
}

export function packToReport(result: ValidationResult): string {
  const lines = result.issues.map((i) => `${i.level.toUpperCase()}${i.n ? ` (Q${i.n})` : ''}: ${i.message}`)
  return lines.join('\n')
}
