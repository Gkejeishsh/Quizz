// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNCATEGORIZED_ID } from '../types'
import type { Pack } from '../types'

const pack: Pack = {
  format: 'quizz-pack',
  formatVersion: 1,
  id: 'pck_store_1',
  title: 'Store test',
  createdAt: new Date().toISOString(),
  questions: [
    {
      n: 1,
      type: 'single',
      question: 'Q1?',
      options: [
        { key: 'A', text: 'a' },
        { key: 'B', text: 'b' },
      ],
      answer: ['A'],
      explanation: 'because',
    },
  ],
}

async function freshStore() {
  vi.resetModules()
  const mod = await import('../store')
  await mod.useStore.getState().hydrate()
  return mod
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis, 'indexedDB', { writable: true, value: undefined })
})

describe('library mutations', () => {
  it('saves a pack with a custom name and category', async () => {
    const { useStore } = await freshStore()
    const cat = useStore.getState().categories[0]
    const test = useStore.getState().savePack(pack, { name: 'My name', categoryId: cat.id })
    expect(test.name).toBe('My name')
    expect(test.questionCount).toBe(1)
    expect(useStore.getState().tests[0].id).toBe(test.id)
  })

  it('falls back to the pack title when the name is blank', async () => {
    const { useStore } = await freshStore()
    const test = useStore.getState().savePack(pack, { name: '   ', categoryId: UNCATEGORIZED_ID })
    expect(test.name).toBe('Store test')
  })

  it('keeps the full pack content, so deleting the source file changes nothing', async () => {
    const { useStore } = await freshStore()
    const test = useStore.getState().savePack(pack, { name: 'Kept', categoryId: UNCATEGORIZED_ID })
    const stored = useStore.getState().tests.find((t) => t.id === test.id)!
    expect(stored.pack.questions[0].answer).toEqual(['A'])
    expect(stored.pack.questions[0].explanation).toBe('because')
  })

  it('renames, moves and deletes a test', async () => {
    const { useStore } = await freshStore()
    const [a, b] = useStore.getState().categories
    const test = useStore.getState().savePack(pack, { name: 'Old', categoryId: a.id })

    useStore.getState().renameTest(test.id, 'New')
    expect(useStore.getState().tests.find((t) => t.id === test.id)?.name).toBe('New')

    useStore.getState().moveTest(test.id, b.id)
    expect(useStore.getState().tests.find((t) => t.id === test.id)?.categoryId).toBe(b.id)

    useStore.getState().deleteTest(test.id)
    expect(useStore.getState().tests.find((t) => t.id === test.id)).toBeUndefined()
  })

  it('moves tests to Uncategorized when their category is deleted', async () => {
    const { useStore } = await freshStore()
    const cat = useStore.getState().addCategory('Temporary')
    const test = useStore.getState().savePack(pack, { name: 'Mine', categoryId: cat.id })
    useStore.getState().deleteCategory(cat.id)
    expect(useStore.getState().tests.find((t) => t.id === test.id)?.categoryId).toBe(UNCATEGORIZED_ID)
    expect(useStore.getState().categories.some((c) => c.id === cat.id)).toBe(false)
  })

  it('never deletes the protected Uncategorized category', async () => {
    const { useStore } = await freshStore()
    useStore.getState().deleteCategory(UNCATEGORIZED_ID)
    expect(useStore.getState().categories.some((c) => c.id === UNCATEGORIZED_ID)).toBe(true)
  })

  it('keeps attempt history when a test is deleted', async () => {
    const { useStore } = await freshStore()
    const test = useStore.getState().savePack(pack, { name: 'Gone soon', categoryId: UNCATEGORIZED_ID })
    useStore.getState().submitAttempt({
      id: 'att_1',
      testId: test.id,
      testName: test.name,
      categoryId: test.categoryId,
      startedAt: Date.now() - 1000,
      finishedAt: Date.now(),
      durationMs: 1000,
      answers: { '1': ['A'] },
      questionNs: [1],
      score: 1,
      total: 1,
      marked: 1,
      mode: 'full',
      timed: false,
      timeUp: false,
    })
    useStore.getState().deleteTest(test.id)
    const attempt = useStore.getState().attempts.find((a) => a.id === 'att_1')
    expect(attempt?.testName).toBe('Gone soon')
  })

  it('round-trips a backup snapshot', async () => {
    const { useStore } = await freshStore()
    const saved = useStore.getState().savePack(pack, { name: 'Backed up', categoryId: UNCATEGORIZED_ID })
    const snapshot = {
      schemaVersion: 1,
      settings: useStore.getState().settings,
      categories: useStore.getState().categories,
      tests: useStore.getState().tests,
      attempts: useStore.getState().attempts,
      drafts: useStore.getState().drafts,
    }
    useStore.getState().deleteTest(saved.id)
    expect(useStore.getState().tests.find((t) => t.id === saved.id)).toBeUndefined()

    useStore.getState().restoreSnapshot(snapshot)
    expect(useStore.getState().tests.find((t) => t.id === saved.id)?.name).toBe('Backed up')
  })
})
