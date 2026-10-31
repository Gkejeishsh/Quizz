export type PackOption = {
  key: string
  text: string
  asset?: string | null
}

export type PackQuestion = {
  n: number
  type: 'single' | 'multi' | 'truefalse'
  question: string
  options: PackOption[]
  answer: string[]
  explanation?: string
  group?: string | null
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
  asset?: string | null
  sourceRef?: { page?: number; block?: string }
}

export type PackGroup = {
  id: string
  type: 'passage' | 'diagram' | 'table' | 'section'
  title?: string
  text: string
  asset?: string | null
  instructions?: string
}

export type PackSource = {
  fileName?: string
  pages?: number
  generator?: string
  checksum?: string
}

export type Pack = {
  format: 'quizz-pack'
  formatVersion: number
  id: string
  revision?: number
  supersedes?: string | null
  title: string
  subject?: string
  language?: string
  createdAt: string
  instructions?: string
  durationMinutes?: number
  source?: PackSource
  groups?: PackGroup[]
  questions: PackQuestion[]
  assets?: Record<string, { mime: string; data: string; width?: number; height?: number }>
}

export type Category = {
  id: string
  name: string
  color: string
  order: number
  locked?: boolean
}

export type TestRecord = {
  id: string
  packId: string
  name: string
  categoryId: string
  createdAt: number
  updatedAt: number
  savedDate: number
  questionCount: number
  sourceFileName?: string
  checksum?: string
  pack: Pack
}

export type Answers = Record<string, string[]>

export type Attempt = {
  id: string
  testId: string
  testName: string
  categoryId: string
  startedAt: number
  finishedAt: number
  durationMs: number
  answers: Answers
  questionNs: number[]
  score: number
  total: number
  marked: number
  mode: 'full' | 'wrong-only'
  timed: boolean
  timeUp: boolean
}

export type Draft = {
  testId: string
  testName: string
  answers: Answers
  index: number
  questionNs: number[]
  startedAt: number
  deadline: number | null
  timed: boolean
}

export type Settings = {
  theme: 'system' | 'light' | 'dark'
  haptics: boolean
  fontScale: 'sm' | 'md' | 'lg'
  reduceMotion: boolean
  sound: boolean
}

export type PersistedState = {
  schemaVersion: number
  settings: Settings
  categories: Category[]
  tests: TestRecord[]
  attempts: Attempt[]
  drafts: Draft[]
}

export const CATEGORY_COLORS = [
  '#6D5BFF',
  '#0FB5C9',
  '#0E9F6E',
  '#E08700',
  '#D93A46',
  '#A855F7',
  '#EC4899',
  '#3B82F6',
] as const

export const UNCATEGORIZED_ID = 'cat_uncategorized'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_english', name: 'English', color: '#3B82F6', order: 0 },
  { id: 'cat_maths', name: 'Maths', color: '#6D5BFF', order: 1 },
  { id: 'cat_physics', name: 'Physics', color: '#0FB5C9', order: 2 },
  { id: 'cat_chemistry', name: 'Chemistry', color: '#0E9F6E', order: 3 },
  { id: 'cat_biology', name: 'Biology', color: '#A855F7', order: 4 },
  { id: UNCATEGORIZED_ID, name: 'Uncategorized', color: '#7A8199', order: 99, locked: true },
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  haptics: true,
  fontScale: 'md',
  reduceMotion: false,
  sound: false,
}
