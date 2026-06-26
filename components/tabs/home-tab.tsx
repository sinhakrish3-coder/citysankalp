'use client'
// ─────────────────────────────────────────────────────────────
//  HomeTab — PLUMBING ONLY. Zero UI changes.
//  Replaced static `issues` import with useIssues() hook.
//  Loading skeleton matches the card footprint exactly.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Camera, MapPin } from 'lucide-react'
import { MapPlaceholder } from '@/components/map-placeholder'
import { IssueCard } from '@/components/issue-card'
import { SnapReportSheet } from '@/components/snap-report-sheet'
import { useIssues } from '@/lib/hooks/useIssues'

const STATUS_FILTERS = ['All', 'Open', 'Verified', 'NGO Claimed', 'In Progress', 'Gov Jurisdiction']

function IssueCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex gap-3 p-3">
        <div className="size-20 shrink-0 rounded-xl bg-secondary/60" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <div className="flex gap-1.5">
            <div className="h-4 w-14 rounded-full bg-secondary/60" />
            <div className="h-4 w-20 rounded-full bg-secondary/60" />
          </div>
          <div className="h-4 w-full rounded bg-secondary/60" />
          <div className="h-4 w-3/4 rounded bg-secondary/60" />
          <div className="mt-auto h-3 w-24 rounded bg-secondary/40" />
        </div>
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-secondary/40 py-2">
          <div className="h-5 w-5 rounded bg-secondary/60" />
          <div className="h-4 w-6 rounded bg-secondary/60" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border/60 bg-secondary/20 px-3 py-2">
        <div className="h-3 w-3 rounded-full bg-secondary/60" />
        <div className="h-1.5 flex-1 rounded-full bg-secondary/60" />
        <div className="h-3 w-20 rounded bg-secondary/40" />
      </div>
    </div>
  )
}

export function HomeTab() {
  const { issues, loading, error } = useIssues()
  const [reportOpen, setReportOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredIssues = issues.filter(issue => statusFilter === 'All' || issue.status === statusFilter)

  return (
    <div className="relative">
      <MapPlaceholder />

      <section className="px-4 pb-4 pt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Recent Local Issues
          </h2>
          <span className="text-xs text-muted-foreground">
            {loading ? '…' : error ? 'Error' : `${issues.length} nearby`}
          </span>
        </div>

        {error && (
          <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
            Could not load issues: {error}
          </p>
        )}

        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-secondary/40 text-muted-foreground ring-border hover:bg-secondary'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <IssueCardSkeleton key={i} />)
            : filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-12 text-center">
                  <MapPin className="mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Your locality is clear!</p>
                  <p className="mt-1 text-xs text-muted-foreground">Be the first to report an issue.</p>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="mt-4 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    Report Now
                  </button>
                </div>
              )
            : filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      </section>

      {/* Glowing Snap & Report FAB */}
      <div className="pointer-events-none sticky bottom-20 z-30 flex justify-center pb-2">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="pointer-events-auto relative flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-2px] shadow-primary/60 ring-1 ring-primary/40 transition-transform active:scale-95"
        >
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40" />
          <Camera className="size-5" aria-hidden="true" />
          Snap &amp; Report
        </button>
      </div>

      <SnapReportSheet open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}
