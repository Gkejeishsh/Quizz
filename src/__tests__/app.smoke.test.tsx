// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  // force the localStorage fallback instead of IndexedDB
  Object.defineProperty(globalThis, 'indexedDB', { writable: true, value: undefined })
}

beforeEach(() => {
  stubEnvironment()
  localStorage.clear()
})
afterEach(cleanup)

it('boots, seeds the demo library and shows the home actions', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Ready when'), { timeout: 4000 })
  expect(document.body.textContent).toContain('Add new test')
  expect(document.body.textContent).toContain('Saved tests')
  // seeded demo tests show up in the recent list
  expect(document.body.textContent).toContain('Chemical Bonding')
})

it('navigates from home into saved tests and back', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Ready when'), { timeout: 4000 })
  fireEvent.click(screen.getByText('Saved tests'))
  await waitFor(() => expect(document.body.textContent).toContain('newest first'), { timeout: 4000 })
  expect(document.body.textContent).toContain('Algebra & Geometry')
  fireEvent.click(screen.getByLabelText('Back'))
  await waitFor(() => expect(document.body.textContent).toContain('Ready when'), { timeout: 4000 })
}, 15000)

it('plays a test end to end and records the attempt in history', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Ready when'), { timeout: 4000 })

  fireEvent.click(screen.getByText('Saved tests'))
  await waitFor(() => expect(document.body.textContent).toContain('Chemical Bonding'), { timeout: 4000 })

  fireEvent.click(screen.getByText('Chemical Bonding — Practice Test'))
  await waitFor(() => expect(document.body.textContent).toContain('Start test'), { timeout: 4000 })

  // start sheet: timer is optional and off by default
  fireEvent.click(screen.getByText('Start test'))
  await waitFor(() => expect(document.body.textContent).toContain('One-time only'), { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))

  await waitFor(() => expect(document.body.textContent).toContain('01'), { timeout: 4000 })

  // answer all 8 questions
  for (let i = 0; i < 8; i++) {
    await waitFor(() => {
      const options = document.querySelectorAll('button[aria-pressed]')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 4000 })
    const options = document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')
    fireEvent.click(options[0])
    await new Promise((r) => setTimeout(r, 320))
  }

  await waitFor(() => expect(document.body.textContent).toContain('Test complete'), { timeout: 6000 })
  expect(document.body.textContent).toContain('Show explanation')

  // history is derived and should now contain the attempt
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(document.body.textContent).toContain('Start test'), { timeout: 3000 })
  fireEvent.click(screen.getByLabelText('Back'))
  await waitFor(() => expect(document.body.textContent).toContain('newest first'), { timeout: 3000 })
  fireEvent.click(screen.getByLabelText('Back'))
  await waitFor(() => expect(document.body.textContent).toContain('Ready when'), { timeout: 3000 })
  fireEvent.click(screen.getByText('History'))
  await waitFor(() => expect(document.body.textContent).toContain('Attempts'), { timeout: 3000 })
  expect(document.body.textContent).toContain('Chemical Bonding — Practice Test')
}, 40000)
