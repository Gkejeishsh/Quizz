// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import App from '../App'

function stubEnvironment() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  })
  Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() })
  Object.defineProperty(globalThis, 'indexedDB', { writable: true, value: undefined })
}

/**
 * End-to-end check of the round-6 direction work: opening the Urdu study drill
 * must give pure-Urdu options `dir="rtl"` while the English stem stays LTR.
 */
beforeEach(async () => {
  stubEnvironment()
  localStorage.clear()
  const { useStore } = await import('../lib/store')
  useStore.setState({ routes: [{ name: 'home' }] })
})
afterEach(cleanup)

it('renders Urdu options right-to-left inside an English question', async () => {
  const { useStore } = await import('../lib/store')
  render(<App />)
  await waitFor(() => expect(useStore.getState().tests.length).toBeGreaterThan(3), { timeout: 4000 })

  const study = useStore.getState().tests.find((t) => t.pack.id === 'pck_hecvocab_study_1')
  expect(study).toBeTruthy()

  useStore.getState().push({ name: 'play', testId: study!.id })
  await waitFor(() => expect(document.querySelector('.q-text')).toBeTruthy(), { timeout: 4000 })

  const stem = document.querySelector('.q-text') as HTMLElement
  expect(stem.textContent).toContain('mean in Urdu')
  expect(stem.getAttribute('dir')).not.toBe('rtl')
  expect(stem.className).not.toContain('q-text--rtl')

  const urduOptions = Array.from(document.querySelectorAll('.option__text'))
  expect(urduOptions.length).toBeGreaterThan(0)
  for (const option of urduOptions) {
    expect(option.className).toContain('option__text--rtl')
    const inner = option.querySelector('.is-rtl')
    if (inner) expect(inner.getAttribute('dir')).toBe('rtl')
  }
})
