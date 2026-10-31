import { create } from 'zustand'
import { loadState, saveState } from './storage'
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  UNCATEGORIZED_ID,
  type Attempt,
  type Category,
  type Draft,
  type Pack,
  type PersistedState,
  type Settings,
  type TestRecord,
} from './types'
import { DEMO_PACKS } from '../data/demoPacks'

export type Route =
  | { name: 'home' }
  | { name: 'import' }
  | { name: 'library' }
  | { name: 'test'; testId: string }
  | { name: 'play'; testId: string }
  | { name: 'results'; attemptId: string }
  | { name: 'review'; testId: string; attemptId?: string }
  | { name: 'history' }
  | { name: 'categories' }
  | { name: 'settings' }

export type Toast = { id: string; message: string; tone: 'neutral' | 'success' | 'error' }

const SCHEMA_VERSION = 1

export function uid(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}_${rnd}`
}

export type SavePackOptions = { name: string; categoryId: string; saveAsCopy?: boolean }

type Store = {
  hydrated: boolean
  settings: Settings
  categories: Category[]
  tests: TestRecord[]
  attempts: Attempt[]
  drafts: Draft[]
  routes: Route[]
  toasts: Toast[]
  hydrate: () => Promise<void>
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  addCategory: (name: string) => Category
  renameCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
  savePack: (pack: Pack, options: SavePackOptions) => TestRecord
  renameTest: (id: string, name: string) => void
  moveTest: (id: string, categoryId: string) => void
  deleteTest: (id: string) => void
  saveDraft: (draft: Draft) => void
  clearDraft: (testId: string) => void
  submitAttempt: (attempt: Attempt) => void
  restoreSnapshot: (data: PersistedState) => void
  push: (route: Route) => void
  pop: () => void
  resetTo: (route: Route) => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  testById: (id: string) => TestRecord | undefined
  attemptById: (id: string) => Attempt | undefined
}

function seedTests(categories: Category[]): TestRecord[] {
  const chem = categories.find((c) => c.name === 'Chemistry')
  const maths = categories.find((c) => c.name === 'Maths')
  const picks: [Pack, string | undefined][] = [
    [DEMO_PACKS[0], maths?.id], // HEC Quantitative Practice Test 2
    [DEMO_PACKS[1], chem?.id], // Chemical Bonding — Practice Test
  ]
  const now = Date.now()
  return picks.map(([pack, categoryId], i) => ({
    id: uid('tst'),
    packId: pack.id,
    name: pack.title,
    categoryId: categoryId ?? UNCATEGORIZED_ID,
    createdAt: now - i * 60_000,
    updatedAt: now - i * 60_000,
    savedDate: now - i * 60_000,
    questionCount: pack.questions.length,
    sourceFileName: pack.source?.fileName,
    checksum: pack.source?.checksum,
    pack,
  }))
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let hydratePromise: Promise<void> | null = null

export const useStore = create<Store>()((set, get) => {
  const persistNow = () => {
    const s = get()
    const snapshot: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      settings: s.settings,
      categories: s.categories,
      tests: s.tests,
      attempts: s.attempts,
      drafts: s.drafts,
    }
    saveState(snapshot).catch((err) => {
      console.warn('Quizz: could not persist state', err)
      get().toast('Could not save to this device — storage may be full', 'error')
    })
  }
  const schedulePersist = () => {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(persistNow, 180)
  }

  return {
    hydrated: false,
    settings: DEFAULT_SETTINGS,
    categories: DEFAULT_CATEGORIES,
    tests: [],
    attempts: [],
    drafts: [],
    routes: [{ name: 'home' }],
    toasts: [],

    hydrate: async () => {
      if (get().hydrated) return
      if (hydratePromise) return hydratePromise
      hydratePromise = (async () => {
        const loaded = await loadState()
        if (loaded && Array.isArray(loaded.categories) && loaded.categories.length) {
          const version = typeof loaded.schemaVersion === 'number' ? loaded.schemaVersion : 1
          if (version > SCHEMA_VERSION) {
            console.warn(
              `Quizz: this data was written by a newer app version (schema ${version}).`,
              'It will be loaded as-is; update the app to be sure everything works.',
            )
          }
          const categories = [...loaded.categories].sort((a, b) => a.order - b.order)
          const hasUncategorized = categories.some((c) => c.id === UNCATEGORIZED_ID)
          set({
            hydrated: true,
            settings: { ...DEFAULT_SETTINGS, ...(loaded.settings ?? {}) },
            categories: hasUncategorized ? categories : [...categories, DEFAULT_CATEGORIES.at(-1)!],
            tests: (loaded.tests ?? []).slice().sort((a, b) => b.savedDate - a.savedDate),
            attempts: (loaded.attempts ?? []).slice().sort((a, b) => b.finishedAt - a.finishedAt),
            drafts: loaded.drafts ?? [],
          })
        } else {
          // first launch: seed the bundled demo tests so every screen has content
          const tests = seedTests(DEFAULT_CATEGORIES)
          set({
            hydrated: true,
            settings: DEFAULT_SETTINGS,
            categories: DEFAULT_CATEGORIES,
            tests,
            attempts: [],
            drafts: [],
          })
          setTimeout(persistNow, 0)
        }
      })()
      await hydratePromise
    },

    setSetting: (key, value) => {
      set((s) => ({ settings: { ...s.settings, [key]: value } }))
      schedulePersist()
    },

    addCategory: (name) => {
      const trimmed = name.trim() || 'New category'
      const existing = get().categories
      const palette = ['#6D5BFF', '#0FB5C9', '#0E9F6E', '#E08700', '#D93A46', '#A855F7', '#EC4899', '#3B82F6']
      const category: Category = {
        id: uid('cat'),
        name: trimmed,
        color: palette[existing.length % palette.length],
        order: Math.max(0, ...existing.map((c) => c.order)) + 1,
      }
      set((s) => ({ categories: [...s.categories, category] }))
      schedulePersist()
      return category
    },

    renameCategory: (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      set((s) => ({
        categories: s.categories.map((c) => (c.id === id && !c.locked ? { ...c, name: trimmed } : c)),
      }))
      schedulePersist()
    },

    deleteCategory: (id) => {
      const cat = get().categories.find((c) => c.id === id)
      if (!cat || cat.locked) return
      set((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        tests: s.tests.map((t) => (t.categoryId === id ? { ...t, categoryId: UNCATEGORIZED_ID } : t)),
      }))
      schedulePersist()
    },

    savePack: (pack, options) => {
      const name = options.name.trim() || pack.title
      const now = Date.now()
      const test: TestRecord = {
        id: uid('tst'),
        packId: pack.id,
        name,
        categoryId: options.categoryId,
        createdAt: now,
        updatedAt: now,
        savedDate: now,
        questionCount: pack.questions.length,
        sourceFileName: pack.source?.fileName,
        checksum: pack.source?.checksum,
        pack,
      }
      set((s) => ({ tests: [test, ...s.tests] }))
      schedulePersist()
      return test
    },

    renameTest: (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const now = Date.now()
      set((s) => ({
        tests: s.tests.map((t) => (t.id === id ? { ...t, name: trimmed, updatedAt: now } : t)),
      }))
      schedulePersist()
    },

    moveTest: (id, categoryId) => {
      const now = Date.now()
      set((s) => ({
        tests: s.tests.map((t) => (t.id === id ? { ...t, categoryId, updatedAt: now } : t)),
      }))
      schedulePersist()
    },

    deleteTest: (id) => {
      set((s) => ({
        tests: s.tests.filter((t) => t.id !== id),
        drafts: s.drafts.filter((d) => d.testId !== id),
      }))
      schedulePersist()
    },

    saveDraft: (draft) => {
      set((s) => ({
        drafts: [draft, ...s.drafts.filter((d) => d.testId !== draft.testId)],
      }))
      schedulePersist()
    },

    clearDraft: (testId) => {
      set((s) => ({ drafts: s.drafts.filter((d) => d.testId !== testId) }))
      schedulePersist()
    },

    submitAttempt: (attempt) => {
      set((s) => ({
        attempts: [attempt, ...s.attempts],
        drafts: s.drafts.filter((d) => d.testId !== attempt.testId),
      }))
      schedulePersist()
    },

    restoreSnapshot: (data) => {
      set({
        settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
        categories: (data.categories ?? DEFAULT_CATEGORIES).slice().sort((a, b) => a.order - b.order),
        tests: (data.tests ?? []).slice().sort((a, b) => b.savedDate - a.savedDate),
        attempts: (data.attempts ?? []).slice().sort((a, b) => b.finishedAt - a.finishedAt),
        drafts: data.drafts ?? [],
        routes: [{ name: 'home' }],
      })
      schedulePersist()
    },

    push: (route) => set((s) => ({ routes: [...s.routes.slice(-39), route] })),
    pop: () =>
      set((s) => ({ routes: s.routes.length > 1 ? s.routes.slice(0, -1) : s.routes })),
    resetTo: (route) => set({ routes: [route] }),

    toast: (message, tone = 'neutral') => {
      const t: Toast = { id: uid('tst'), message, tone }
      set((s) => ({ toasts: [...s.toasts, t].slice(-3) }))
      setTimeout(() => get().dismissToast(t.id), 3000)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    testById: (id) => get().tests.find((t) => t.id === id),
    attemptById: (id) => get().attempts.find((a) => a.id === id),
  }
})

export function resolveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

export function applyTheme(theme: Settings['theme']) {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#080A11' : '#F4F5FA')
  return resolved
}

export function categoryById(categories: Category[], id: string): Category {
  return categories.find((c) => c.id === id) ?? categories.find((c) => c.id === UNCATEGORIZED_ID) ?? categories[0]
}

export function bestAttempts(attempts: Attempt[], testId: string): Attempt | null {
  const list = attempts.filter((a) => a.testId === testId)
  if (!list.length) return null
  return list.reduce((best, a) =>
    a.score / Math.max(1, a.total) > best.score / Math.max(1, best.total) ? a : best,
  )
}

export function latestAttempt(attempts: Attempt[], testId: string): Attempt | null {
  const list = attempts.filter((a) => a.testId === testId).sort((a, b) => b.finishedAt - a.finishedAt)
  return list[0] ?? null
}
