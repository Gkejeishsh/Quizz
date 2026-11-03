/**
 * Script detection for the quiz text.
 *
 * Urdu/Arabic is a right-to-left script. Two different things need to be right:
 *
 *  1. **Glyphs** — every text container must have an Arabic-capable face in its
 *     font stack, or Urdu shows as boxes (tofu).
 *  2. **Direction** — a *purely* Urdu string ("ذلت و رسوائی") should be laid out
 *     RTL, while a *mixed* line such as `“خود مختار” means:` must stay LTR with
 *     the Urdu run reordered by the bidi algorithm, exactly as it is printed in
 *     the source PDF.
 *
 * So: any Latin letter present ⇒ LTR (mixed content, matches the PDF);
 * Arabic letters and no Latin ⇒ RTL.
 */

/** Arabic, Arabic Supplement/Extended, Arabic Presentation Forms A/B. */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/** Basic Latin plus Latin-1/Extended-A letters (covers English, accents). */
const LATIN = /[A-Za-z\u00C0-\u024F]/

export function hasArabic(text: string): boolean {
  return ARABIC.test(text)
}

export function hasLatin(text: string): boolean {
  return LATIN.test(text)
}

/**
 * 'rtl' only for text that is Arabic-script *and* carries no Latin letters.
 * Mixed strings keep LTR so they read the way the PDF prints them.
 */
export function textDir(text: string): 'rtl' | 'ltr' {
  if (!text) return 'ltr'
  if (hasLatin(text)) return 'ltr'
  return hasArabic(text) ? 'rtl' : 'ltr'
}

/** True when the string needs the Urdu face, alignment and tracking overrides. */
export function isUrduBlock(text: string): boolean {
  return textDir(text) === 'rtl'
}

/** Fraction of letters that are Arabic — used only for diagnostics/tests. */
export function arabicShare(text: string): number {
  const letters = Array.from(text).filter((c) => ARABIC.test(c) || LATIN.test(c))
  if (!letters.length) return 0
  return letters.filter((c) => ARABIC.test(c)).length / letters.length
}
