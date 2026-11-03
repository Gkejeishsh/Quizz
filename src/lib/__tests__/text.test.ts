// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { arabicShare, hasArabic, isUrduBlock, textDir } from '../text'

/**
 * Direction rules that keep the PDF layout intact:
 * Latin anywhere ⇒ LTR (mixed lines read like the paper), pure Urdu ⇒ RTL.
 */
describe('text direction', () => {
  it('detects Arabic script', () => {
    expect(hasArabic('ذلت و رسوائی')).toBe(true)
    expect(hasArabic('CAJOLE means:')).toBe(false)
  })

  it('treats a pure Urdu string as RTL', () => {
    expect(textDir('ذلت و رسوائی')).toBe('rtl')
    expect(textDir('“خود مختار”')).toBe('rtl')
    expect(textDir('ہم آہنگ')).toBe('rtl')
  })

  it('keeps mixed English + Urdu lines LTR (the PDF order)', () => {
    expect(textDir('“خود مختار” means:')).toBe('ltr')
    expect(textDir('HUMILIATION means: ذلت')).toBe('ltr')
  })

  it('leaves English, numbers and symbols alone', () => {
    expect(textDir('CAJOLE means:')).toBe('ltr')
    expect(textDir('12 ÷ 3 = 4')).toBe('ltr')
    expect(textDir('')).toBe('ltr')
    expect(textDir('—')).toBe('ltr')
  })

  it('exposes the helper used by the screens', () => {
    expect(isUrduBlock('عزت افزائی')).toBe(true)
    expect(isUrduBlock('reciprocal')).toBe(false)
  })

  it('measures the Arabic share without counting punctuation', () => {
    expect(arabicShare('ذلت و رسوائی')).toBe(1)
    expect(arabicShare('CAJOLE')).toBe(0)
    expect(arabicShare('“خود مختار” means:')).toBeCloseTo(8 / 13, 2)
  })
})
