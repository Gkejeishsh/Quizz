import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = (props: P) => ({
  // Explicit intrinsic size: a bare <svg> would otherwise default to 300x150.
  // Any CSS rule (.btn > svg, .icon-btn svg, inline styles…) still wins.
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const Plus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const ArrowRight = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const ArrowLeft = (p: P) => (
  <svg {...base(p)}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
)
export const ChevronRight = (p: P) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
)
export const ChevronDown = (p: P) => (
  <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>
)
export const X = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const Check = (p: P) => (
  <svg {...base(p)}><path d="M4 12.5l5 5L20 6.5" /></svg>
)
export const CheckCircle = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.6 2.6L16.2 9.3" /></svg>
)
export const AlertCircle = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16.2v.1" /></svg>
)
export const Info = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.1" /></svg>
)
export const History = (p: P) => (
  <svg {...base(p)}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" /><path d="M3.5 4.5v4h4" /><path d="M12 7.5V12l3 1.8" /></svg>
)
export const Grid = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
)
export const FileText = (p: P) => (
  <svg {...base(p)}><path d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-17Z" /><path d="M13 3.5V9h5M9 13h6M9 16.5h4" /></svg>
)
export const Upload = (p: P) => (
  <svg {...base(p)}><path d="M12 16V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
)
export const Download = (p: P) => (
  <svg {...base(p)}><path d="M12 4v12M7.5 11.5L12 16l4.5-4.5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
)
export const Share = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5v11M8.5 7L12 3.5 15.5 7" /><path d="M6 12.5H4.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6H18" /></svg>
)
export const Search = (p: P) => (
  <svg {...base(p)}><circle cx="10.8" cy="10.8" r="6.3" /><path d="M15.5 15.5L20 20" /></svg>
)
export const Sun = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></svg>
)
export const Moon = (p: P) => (
  <svg {...base(p)}><path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" /></svg>
)
export const Clock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.6" /><path d="M12 7.6V12l3 1.9" /></svg>
)
export const Flag = (p: P) => (
  <svg {...base(p)}><path d="M6 21V4.5M6 5h10.5l-1.6 3.6L16.5 12H6" /></svg>
)
export const Dots = (p: P) => (
  <svg {...base(p)}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
)
export const Trash = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" /><path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12" /><path d="M10.5 11v6M13.5 11v6" /></svg>
)
export const Pencil = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4l10.2-10.2a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" /><path d="M13.5 6.5l4 4" /></svg>
)
export const Folder = (p: P) => (
  <svg {...base(p)}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8A1.5 1.5 0 0 1 20.5 10v8A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" /></svg>
)
export const FolderPlus = (p: P) => (
  <svg {...base(p)}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8A1.5 1.5 0 0 1 20.5 10v8A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" /><path d="M12 11.5v5M9.5 14h5" /></svg>
)
export const Settings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3.1" /><path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></svg>
)
export const Play = (p: P) => (
  <svg {...base(p)}><path d="M7.5 4.8v14.4L19 12 7.5 4.8Z" fill="currentColor" stroke="none" /></svg>
)
export const Eye = (p: P) => (
  <svg {...base(p)}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>
)
export const Refresh = (p: P) => (
  <svg {...base(p)}><path d="M20 11.5A8 8 0 1 0 18 17" /><path d="M20 4.5v5h-5" /></svg>
)
export const Target = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></svg>
)
export const Sparkles = (p: P) => (
  <svg {...base(p)}><path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4L12 3Z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></svg>
)
export const ListChecks = (p: P) => (
  <svg {...base(p)}><path d="M4 6.5l1.8 1.8L9 5" /><path d="M4 13l1.8 1.8L9 11.5" /><path d="M4 19.5l1.8 1.8L9 18" /><path d="M12 7h8M12 13.5h8M12 20h8" /></svg>
)
export const BookOpen = (p: P) => (
  <svg {...base(p)}><path d="M12 6.5C10.4 5.2 8.3 4.5 5.5 4.5c-.8 0-1.5.1-2 .2v14c.5-.1 1.2-.2 2-.2 2.8 0 4.9.7 6.5 2 1.6-1.3 3.7-2 6.5-2 .8 0 1.5.1 2 .2v-14c-.5-.1-1.2-.2-2-.2-2.8 0-4.9.7-6.5 2Z" /><path d="M12 6.5v14" /></svg>
)
export const Copy = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2.2" /><path d="M15 9V6.2A2.2 2.2 0 0 0 12.8 4H6.2A2.2 2.2 0 0 0 4 6.2v6.6A2.2 2.2 0 0 0 6.2 15H9" /></svg>
)
export const ArrowUpRight = (p: P) => (
  <svg {...base(p)}><path d="M7 17L17 7M9 7h8v8" /></svg>
)
export const Flame = (p: P) => (
  <svg {...base(p)}><path d="M12 21c3.6 0 6-2.4 6-5.4 0-2.3-1.3-4.2-3-5.9-.6 1.7-1.6 2.6-2.6 2.9.4-2.6-.7-5.3-3.1-6.6.2 2.3-.9 3.9-2.2 5.6C6 12.7 6 13.6 6 15.6 6 18.6 8.4 21 12 21Z" /></svg>
)
export const Trophy = (p: P) => (
  <svg {...base(p)}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3" /><path d="M12 13v4M9 21h6M10 17h4" /></svg>
)
export const ShieldCheck = (p: P) => (
  <svg {...base(p)}><path d="M12 3.2 19 6v5.2c0 4.2-2.8 7.6-7 9.6-4.2-2-7-5.4-7-9.6V6l7-2.8Z" /><path d="M9 11.6l2.1 2.1 3.9-4.2" /></svg>
)
export const Lightning = (p: P) => (
  <svg {...base(p)}><path d="M13 3L5.5 13.5H11l-1 7.5L18.5 10H13l0-7Z" /></svg>
)
