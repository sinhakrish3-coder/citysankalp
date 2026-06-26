// ─────────────────────────────────────────────────────────────
//  lib/utils/timeAgo.ts
//  Converts an ISO-8601 timestamp string into a human-readable
//  relative label identical to the existing UI strings
//  ("12m ago", "2h ago", "1d ago", "3w ago").
// ─────────────────────────────────────────────────────────────

export function timeAgo(isoString: string | null | undefined): string {
  // Guard: null/undefined input (e.g. manually seeded rows) → 'just now'
  if (!isoString) return 'just now'
  const then = new Date(isoString).getTime()
  // Guard: unparseable string → NaN
  if (isNaN(then)) return 'just now'

  const now   = Date.now()
  const diffS = Math.max(0, Math.floor((now - then) / 1000))

  if (diffS < 60)           return `${diffS}s ago`
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60)           return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24)           return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)            return `${diffD}d ago`
  const diffW = Math.floor(diffD / 7)
  if (diffW < 4)            return `${diffW}w ago`
  const diffMo = Math.floor(diffD / 30)
  if (diffMo < 12)          return `${diffMo}mo ago`
  return `${Math.floor(diffD / 365)}y ago`
}

/** Returns daysLeft from an ISO end-date; clamped to 0. */
export function daysLeft(isoEndDate: string | null | undefined): number {
  // Guard: null/undefined input (e.g. competition without ends_at)
  if (!isoEndDate) return 0
  const end = new Date(isoEndDate).getTime()
  if (isNaN(end)) return 0
  const diff = end - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

