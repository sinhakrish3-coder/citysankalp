'use client'
// ─────────────────────────────────────────────────────────────
//  IssueCard — PLUMBING ONLY. Zero UI changes.
//
//  Changes vs original:
//  1. Accepts MappedIssue (same shape as old Issue type).
//  2. useAmplify() hydrates from DB and persists toggling.
//  3. Optimistic count update reverts on error.
//  4. IssueDetailSheet receives the same mapped issue prop.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { ChevronUp, Lock, MapPin, Megaphone, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { categoryStyles, statusStyles } from '@/lib/issues'
import { IssueDetailSheet } from '@/components/issue-detail-sheet'
import { useAmplify } from '@/lib/hooks/useMutations'
import { useAppContext } from '@/providers/AppProviders'
import type { MappedIssue } from '@/lib/utils/mappers'

export function IssueCard({ issue }: { issue: MappedIssue }) {
  const { user } = useAppContext()
  const { toggle, checkAmplified } = useAmplify(issue.id, user?.id)

  const [amplified,    setAmplified]    = useState(false)
  const [localOffset,  setLocalOffset]  = useState(0)   // optimistic delta
  const [open,         setOpen]         = useState(false)

  // Hydrate amplified state from DB (runs once per card mount)
  useEffect(() => {
    let mounted = true
    checkAmplified().then((v) => {
      if (mounted) setAmplified(v)
    })
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.id, user?.id])

  // Reset local offset when server updates
  useEffect(() => {
    setLocalOffset(0)
  }, [issue.amplifies])

  async function handleAmplify() {
    // Optimistic toggle
    const next = !amplified
    setAmplified(next)
    setLocalOffset((v) => v + (next ? 1 : -1))
    // Persist to Supabase (realtime will update the server count separately)
    const committed = await toggle(amplified)
    if (committed !== next) {
      // Server disagreed — revert
      setAmplified(committed)
      setLocalOffset((v) => v + (committed ? 1 : -1))
    }
  }

  // Display count: server count reflects all users. Our localOffset captures
  // the current session's delta so we don't double-count the realtime update.
  const count = issue.amplifies + localOffset
  const pct   = Math.min(100, Math.round((issue.petition.signatures / issue.petition.goal) * 100))

  return (
    <>
      <Card className="gap-0 overflow-hidden border-border/60 bg-card p-0 transition-colors hover:border-primary/30">
        <div className="flex gap-3 p-3">
          {/* Thumbnail */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`View details for ${issue.title}`}
            className="relative size-20 shrink-0 overflow-hidden rounded-xl"
          >
            <img
              src={issue.thumbnail || '/placeholder.svg'}
              alt={issue.thumbnailAlt}
              className="size-full object-cover"
            />
            {issue.restricted && (
              <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-blue-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                <Lock className="size-2.5" aria-hidden="true" />
                Authority
              </span>
            )}
          </button>

          {/* Body */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-0 flex-1 flex-col text-left"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={cn('rounded-full px-2 py-0 text-[11px] font-medium ring-1 ring-inset', categoryStyles[issue.category])}>
                {issue.category}
              </Badge>
              <Badge className={cn('gap-1 rounded-full px-2 py-0 text-[11px] font-medium ring-1 ring-inset', statusStyles[issue.status])}>
                <ShieldCheck className="size-3" aria-hidden="true" />
                {issue.status}
              </Badge>
            </div>

            <h3 className="mt-1.5 line-clamp-2 text-pretty text-sm font-semibold leading-snug">
              {issue.title}
            </h3>

            <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              <span>{issue.distance}</span>
              <span aria-hidden="true">·</span>
              <span>{issue.timeAgo}</span>
            </div>
          </button>

          {/* Amplify control */}
          <button
            type="button"
            onClick={handleAmplify}
            aria-pressed={amplified}
            aria-label={`Amplify this issue. Currently ${count} amplifies`}
            className={cn(
              'flex shrink-0 flex-col items-center gap-0.5 self-stretch rounded-xl border px-3 transition-all',
              amplified
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border/70 bg-secondary/40 text-foreground hover:border-primary/30 hover:text-primary',
            )}
          >
            <ChevronUp
              className={cn('size-5 transition-transform', amplified && '-translate-y-0.5')}
              aria-hidden="true"
            />
            <span className="text-sm font-bold tabular-nums">{count}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
              {amplified ? 'Amped' : 'Amplify'}
            </span>
          </button>
        </div>

        {/* Petition progress strip */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border-t border-border/60 bg-secondary/20 px-3 py-2 text-left transition-colors hover:bg-secondary/40"
        >
          <Megaphone className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
            {issue.petition.signatures.toLocaleString()}/
            {issue.petition.goal.toLocaleString()} signed
          </span>
        </button>
      </Card>

      <IssueDetailSheet issue={issue} open={open} onOpenChange={setOpen} />
    </>
  )
}
