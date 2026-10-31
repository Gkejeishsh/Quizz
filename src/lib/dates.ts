const DAY = 86_400_000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayGroup(ts: number, now = Date.now()): string {
  const today = startOfDay(now)
  const yesterday = today - DAY
  if (ts >= today) return 'Today'
  if (ts >= yesterday) return 'Yesterday'
  if (ts >= today - 6 * DAY) return 'Last 7 days'
  if (ts >= today - 29 * DAY) return 'This month'
  return 'Earlier'
}

export function groupByDay<T>(items: T[], getTs: (item: T) => number, now = Date.now()) {
  const groups: { label: string; items: T[] }[] = []
  const order = ['Today', 'Yesterday', 'Last 7 days', 'This month', 'Earlier']
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const label = dayGroup(getTs(item), now)
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)!.push(item)
  }
  for (const label of order) {
    const list = buckets.get(label)
    if (list && list.length) groups.push({ label, items: list })
  }
  return groups
}

export function formatDate(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  const label = dayGroup(ts, now)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (label === 'Today') return `Today, ${time}`
  if (label === 'Yesterday') return `Yesterday, ${time}`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' })
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
