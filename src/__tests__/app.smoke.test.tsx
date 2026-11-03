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

/**
 * The store module is shared by every test in this file, so the navigation stack
 * has to be reset — otherwise a test that ends mid-quiz leaves the next render()
 * starting on that screen (and the history-sync logic counts stale entries).
 */
beforeEach(async () => {
  stubEnvironment()
  localStorage.clear()
  const { useStore } = await import('../lib/store')
  useStore.setState({ routes: [{ name: 'home' }] })
})
afterEach(cleanup)

it('boots, seeds the demo library and shows the home actions', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })
  expect(document.body.textContent).toContain('Add new test')
  expect(document.body.textContent).toContain('Saved tests')
  // seeded demo tests show up in the recent list
  expect(document.body.textContent).toContain('Chemical Bonding')
})

it('plays the launch animation, then hands over to the app', async () => {
  render(<App />)
  // the animated splash is up immediately…
  expect(document.querySelector('.splash')).not.toBeNull()
  expect(document.body.textContent).toContain('Practice, marked instantly.')
  // …and it always gets out of the way (a stuck splash would brick the app)
  await waitFor(() => expect(document.querySelector('.splash')).toBeNull(), { timeout: 5000 })
  expect(document.body.textContent).toContain('Add new test')
}, 15000)

it('opens the Urdu vocabulary pack and renders its Arabic-script text', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })
  fireEvent.click(screen.getByText('Saved tests'))
  await waitFor(() => expect(document.body.textContent).toContain('HEC Vocabulary'), { timeout: 4000 })

  fireEvent.click(screen.getByText('HEC Vocabulary — 50 Words (English & Urdu)'))
  await waitFor(() => expect(document.body.textContent).toContain('Start test'), { timeout: 4000 })
  fireEvent.click(screen.getByText('Start test'))
  await waitFor(() => expect(document.body.textContent).toContain('One-time only'), { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))

  // Q1 is the PDF's "CAJOLE means:" with the same four options in the same order
  await waitFor(() => expect(document.body.textContent).toContain('CAJOLE'), { timeout: 4000 })
  const first = Array.from(document.querySelectorAll('button.option')).map((o) => o.textContent ?? '')
  expect(first[0]).toContain('A')
  expect(first[0]).toContain('force someone with threats')
  expect(first[2]).toContain('persuade by flattery')
}, 25000)

it('keeps Urdu question text intact (bidi-safe, no lost glyphs)', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })
  fireEvent.click(screen.getByText('Saved tests'))
  await waitFor(() => expect(document.body.textContent).toContain('newest first'), { timeout: 3000 })
  // the pack is stored verbatim: the Urdu strings survive the round-trip
  const { useStore } = await import('../lib/store')
  const pack = useStore.getState().tests.find((t) => t.name.includes('Vocabulary'))?.pack
  expect(pack).toBeTruthy()
  const q11 = pack!.questions.find((q) => q.n === 11)!
  expect(q11.question).toContain('خود مختار')
  expect(q11.options.map((o) => o.text)).toEqual(['reciprocal', 'autonomous', 'obsolete', 'notorious'])
  const q12 = pack!.questions.find((q) => q.n === 12)!
  expect(q12.options[3].text).toBe('ذلت و رسوائی')
  expect(q12.answer).toEqual(['D'])
}, 20000)

it('navigates from home into saved tests and back', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })
  fireEvent.click(screen.getByText('Saved tests'))
  await waitFor(() => expect(document.body.textContent).toContain('newest first'), { timeout: 4000 })
  expect(document.body.textContent).toContain('HEC Quantitative Practice Test 2')
  fireEvent.click(screen.getByLabelText('Back'))
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })
}, 15000)

it('plays a test end to end and records the attempt in history', async () => {
  render(<App />)
  await waitFor(() => expect(document.body.textContent).toContain('Add new test'), { timeout: 4000 })

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
      const options = document.querySelectorAll('button.option')
      expect(options.length).toBeGreaterThan(0)
    }, { timeout: 4000 })
    const options = document.querySelectorAll<HTMLButtonElement>('button.option')
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
  await waitFor(() => expect(document.body.textContent).toContain('Recently saved'), { timeout: 3000 })
  fireEvent.click(screen.getByText('History'))
  await waitFor(() => expect(document.body.textContent).toContain('Attempts'), { timeout: 3000 })
  expect(document.body.textContent).toContain('Chemical Bonding — Practice Test')
}, 40000)
