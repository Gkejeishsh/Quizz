// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Android hardware back gesture used to be a no-op on any screen below the
 * root: the UI layer called preventDefault() and the native fallback then bailed
 * out before popping. This locks down single-source behaviour.
 */

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis, 'indexedDB', { writable: true, value: undefined })
  vi.resetModules()
})

async function setup() {
  const store = await import('../store')
  await store.useStore.getState().hydrate()
  const sheets = await import('../sheets')
  const back = await import('../native')
  return { store, sheets, back }
}

describe('hardware back', () => {
  it('pops one screen when the stack is deep', async () => {
    const { store, back } = await setup()
    store.useStore.getState().push({ name: 'library' })
    store.useStore.getState().push({ name: 'settings' })
    expect(store.useStore.getState().routes).toHaveLength(3)

    expect(back.handleHardwareBack()).toBe(true)
    expect(store.useStore.getState().routes.map((r) => r.name)).toEqual(['home', 'library'])
  })

  it('closes an open sheet before navigating', async () => {
    const { store, sheets, back } = await setup()
    store.useStore.getState().push({ name: 'library' })
    sheets.sheetRegistry.open = 1
    const onClose = vi.fn()
    window.addEventListener(sheets.CLOSE_SHEET_EVENT, onClose)

    expect(back.handleHardwareBack()).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(store.useStore.getState().routes).toHaveLength(2)

    window.removeEventListener(sheets.CLOSE_SHEET_EVENT, onClose)
    sheets.sheetRegistry.open = 0
  })

  it('asks the quiz screen for its exit sheet instead of leaving silently', async () => {
    const { store, back } = await setup()
    store.useStore.getState().push({ name: 'play', testId: 'tst_1' })
    const onExit = vi.fn()
    window.addEventListener('quizz:exit-request', onExit)

    expect(back.handleHardwareBack()).toBe(true)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(store.useStore.getState().routes).toHaveLength(2)

    window.removeEventListener('quizz:exit-request', onExit)
  })

  it('reports "unhandled" at the root so the shell can minimise the app', async () => {
    const { back } = await setup()
    expect(back.handleHardwareBack()).toBe(false)
  })
})
