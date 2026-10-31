type LogoMarkProps = { size?: number; className?: string }

/** The Quizz mark: a Q whose tail becomes a checkmark, with a spark. */
export function LogoMark({ size = 38, className = '' }: LogoMarkProps) {
  return (
    <span className={`logo-mark ${className}`} style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ width: size * 0.66, height: size * 0.66 }}>
        <circle cx="22" cy="24" r="12.5" stroke="white" strokeWidth="3.6" />
        <path d="M29 31.5 L37.5 40" stroke="white" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M16.4 24.2 L20 27.8 L27.6 19.6" stroke="#9FF6FF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 8.5 L40.2 12.3 L44 13.5 L40.2 14.7 L39 18.5 L37.8 14.7 L34 13.5 L37.8 12.3 Z" fill="#C9FFFF" />
      </svg>
    </span>
  )
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="logo-word" style={{ fontSize: size }}>
      Quiz<em>z</em>
    </span>
  )
}

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <Wordmark size={size * 0.58} />
    </span>
  )
}
