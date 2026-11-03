// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { MathText } from '../components/MathText'

afterEach(cleanup)

describe('<MathText> and Urdu', () => {
  it('marks a pure Urdu string as RTL, with the Urdu language tag', () => {
    const { container } = render(<MathText text="ذلت و رسوائی" />)
    const el = container.querySelector('.is-rtl')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('dir')).toBe('rtl')
    expect(el.getAttribute('lang')).toBe('ur')
    expect(el.textContent).toBe('ذلت و رسوائی')
  })

  it('leaves a mixed Urdu/English line LTR so it reads like the PDF', () => {
    const { container } = render(<MathText text="“خود مختار” means:" />)
    expect(container.querySelector('.is-rtl')).toBeNull()
    expect(container.querySelector('span')!.getAttribute('dir')).toBeNull()
    expect(container.textContent).toBe('“خود مختار” means:')
  })

  it('does not touch English or LaTeX text', () => {
    const { container } = render(<MathText text="CAJOLE means:" />)
    expect(container.querySelector('.is-rtl')).toBeNull()
    expect(container.textContent).toBe('CAJOLE means:')
  })
})
