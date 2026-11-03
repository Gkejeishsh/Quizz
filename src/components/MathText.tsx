import { memo, useEffect, useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import { textDir } from '../lib/text'

type Katex = typeof import('katex').default
let katexPromise: Promise<Katex> | null = null

function loadKatex(): Promise<Katex> {
  if (!katexPromise) {
    katexPromise = import('katex').then((m) => m.default)
  }
  return katexPromise
}

const MATH_RE = /\$([^$]+)\$/g

/**
 * Renders quiz text: LaTeX between `$…$` through KaTeX, everything else as-is.
 * Urdu strings additionally get the right-to-left direction, the Urdu font and
 * RTL alignment (see src/lib/text.ts) — English and Maths text is untouched.
 */
export const MathText = memo(function MathText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const hasMath = useMemo(() => /\$[^$]+\$/.test(text), [text])
  const rtl = useMemo(() => textDir(text) === 'rtl', [text])
  const dirProps = rtl
    ? ({ dir: 'rtl' as const, lang: 'ur', className: cn(className, 'is-rtl') })
    : ({ className })
  const [katex, setKatex] = useState<Katex | null>(null)

  useEffect(() => {
    if (!hasMath) return
    let alive = true
    loadKatex()
      .then((k) => {
        if (alive) setKatex(k)
      })
      .catch(() => {
        /* fall back to plain text */
      })
    return () => {
      alive = false
    }
  }, [hasMath])

  if (!hasMath || !katex) return <span {...dirProps}>{text}</span>

  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  const re = new RegExp(MATH_RE)
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    try {
      const html = katex.renderToString(match[1], {
        throwOnError: false,
        trust: false,
        strict: false,
        displayMode: false,
      })
      parts.push(<span key={`m${match.index}`} dangerouslySetInnerHTML={{ __html: html }} />)
    } catch {
      parts.push(`$${match[1]}$`)
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span {...dirProps}>{parts}</span>
})
