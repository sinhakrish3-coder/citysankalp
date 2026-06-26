'use client'
// ─────────────────────────────────────────────────────────────
//  IssueDetailSheet — PLUMBING ONLY. Zero UI changes.
//
//  Changes vs original:
//  1. Accepts MappedIssue (same shape as old Issue type).
//  2. Amplify and petition states hydrate from DB on open.
//  3. usePetition() and useAmplify() persist every toggle.
//  4. useClaimIssue() sends a real claim to the DB.
//  5. All JSX/CSS is byte-for-byte identical to the original.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import {
  BadgeCheck, ChevronUp, Handshake, Lock, MapPin,
  Megaphone, PenLine, ShieldCheck, Users,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Badge }     from '@/components/ui/badge'
import { Button }    from '@/components/ui/button'
import { Progress }  from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn }        from '@/lib/utils'
import { categoryStyles, statusStyles, type ResponderType } from '@/lib/issues'
import { useAmplify, usePetition, useClaimIssue } from '@/lib/hooks/useMutations'
import { useAppContext } from '@/providers/AppProviders'
import type { MappedIssue } from '@/lib/utils/mappers'

const responderLabel: Record<ResponderType, string> = {
  NGO:            'NGO',
  Company:        'Private Partner',
  'Citizen Group': 'Citizen Group',
  Government:     'Government Body',
}

export function IssueDetailSheet({
  issue,
  open,
  onOpenChange,
}: {
  issue: MappedIssue | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, profile: userProfile } = useAppContext()
  const { toggle: toggleAmplify, checkAmplified } = useAmplify(issue?.id ?? '', user?.id)
  const { toggle: togglePetition, checkSigned }   = usePetition(issue?.id ?? '', user?.id)
  const { claim, isLoading: isClaiming }          = useClaimIssue()

  const [amplified,   setAmplified]   = useState(false)
  const [signed,      setSigned]      = useState(false)
  const [claimed,     setClaimed]     = useState(false)
  const [ampOffset,   setAmpOffset]   = useState(0)
  const [sigOffset,   setSigOffset]   = useState(0)

  // Hydrate states when the sheet opens
  useEffect(() => {
    if (!open || !issue) return
    let mounted = true
    checkAmplified().then((v) => {
      if (mounted) setAmplified(v)
    })
    checkSigned().then((v) => {
      if (mounted) setSigned(v)
    })
    // Reset offsets each time the sheet opens with a fresh issue
    setAmpOffset(0)
    setSigOffset(0)
    setClaimed(false)
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issue?.id, user?.id])

  // Reset local offsets when server updates
  useEffect(() => {
    setAmpOffset(0)
  }, [issue?.amplifies])

  useEffect(() => {
    setSigOffset(0)
  }, [issue?.petition.signatures])

  if (!issue) return null

  const amplifies  = issue.amplifies + ampOffset
  const signatures = issue.petition.signatures + sigOffset
  const pct        = Math.min(100, Math.round((signatures / issue.petition.goal) * 100))
  const reached    = signatures >= issue.petition.goal

  async function handleAmplify() {
    const next = !amplified
    setAmplified(next)
    setAmpOffset((v) => v + (next ? 1 : -1))
    const committed = await toggleAmplify(amplified)
    if (committed !== next) {
      setAmplified(committed)
      setAmpOffset((v) => v + (committed ? 1 : -1))
    }
  }

  async function handleSign() {
    const next = !signed
    setSigned(next)
    setSigOffset((v) => v + (next ? 1 : -1))
    const committed = await togglePetition(signed)
    if (committed !== next) {
      setSigned(committed)
      setSigOffset((v) => v + (committed ? 1 : -1))
    }
  }

  async function handleClaim() {
    if (!user?.id || claimed || !issue) return
    const success = await claim(issue.id, user.id)
    if (success) setClaimed(true)
  }

  // A user can only claim if they have a responder_type set on their profile
  const hasResponderRole = !!userProfile?.responder_type
  const canClaim = !issue.restricted && !issue.responder && !claimed && hasResponderRole

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] max-w-md gap-0 overflow-y-auto rounded-t-3xl border-border/60 bg-card p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{issue.title}</SheetTitle>
        </SheetHeader>

        {/* Hero */}
        <div className="relative">
          <img
            src={issue.thumbnail || '/placeholder.svg'}
            alt={issue.thumbnailAlt}
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center gap-1.5">
            <Badge className={cn('rounded-full px-2 py-0 text-[11px] font-medium ring-1 ring-inset', categoryStyles[issue.category])}>
              {issue.category}
            </Badge>
            <Badge className={cn('gap-1 rounded-full px-2 py-0 text-[11px] font-medium ring-1 ring-inset', statusStyles[issue.status])}>
              <ShieldCheck className="size-3" aria-hidden="true" />
              {issue.status}
            </Badge>
            {issue.restricted && (
              <Badge className="gap-1 rounded-full bg-blue-500/15 px-2 py-0 text-[11px] font-medium text-blue-300 ring-1 ring-inset ring-blue-500/25">
                <Lock className="size-3" aria-hidden="true" />
                Authority Only
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4">
          <div>
            <h2 className="text-pretty text-lg font-bold leading-snug">{issue.title}</h2>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              <span>{issue.locality}</span>
              <span aria-hidden="true">·</span>
              <span>{issue.distance}</span>
              <span aria-hidden="true">·</span>
              <span>{issue.timeAgo}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{issue.summary}</p>
          </div>

          {/* Reporter credibility */}
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Reported by</span>
            <span className="font-semibold">{issue.reportedBy}</span>
            {issue.reporterVerified && (
              <BadgeCheck className="size-4 text-primary" aria-label="Verified reporter" />
            )}
          </div>

          {/* Petition */}
          <section className="rounded-xl border border-border/60 bg-secondary/30 p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Locality Petition</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reached
                ? 'Goal reached — this petition has been escalated to the responsible authority.'
                : 'When the signature goal is met, this issue is auto-escalated to the authority as a priority.'}
            </p>
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="font-bold tabular-nums">
                {signatures.toLocaleString()}
                <span className="font-medium text-muted-foreground">
                  {' / '}
                  {issue.petition.goal.toLocaleString()} signatures
                </span>
              </span>
              <span className="text-xs font-semibold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-2 h-2" />
            <Button
              onClick={handleSign}
              variant={signed ? 'secondary' : 'default'}
              className="mt-3 w-full gap-2"
            >
              <PenLine className="size-4" aria-hidden="true" />
              {signed ? 'Signature added' : 'Sign this petition'}
            </Button>
          </section>

          {/* Responders */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Who can act on this</h3>
            {issue.responder ? (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Handshake className="size-4.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold">{issue.responder.name}</span>
                    {issue.responder.verified && (
                      <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified responder" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {responderLabel[issue.responder.type]} ·{' '}
                    {issue.restricted ? 'Assigned authority' : 'Currently handling'}
                  </span>
                </div>
              </div>
            ) : issue.restricted ? (
              <div className="flex items-start gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-xs text-blue-200">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  This issue falls under government jurisdiction. NGOs, companies
                  and citizen groups cannot claim it — only the assigned authority
                  may act.
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Open for a verified NGO, private partner or citizen group to claim
                and resolve.
              </p>
            )}
          </section>

          <Separator className="bg-border/60" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleAmplify}
              variant={amplified ? 'secondary' : 'outline'}
              className="flex-1 gap-2"
              aria-pressed={amplified}
            >
              <ChevronUp className="size-4" aria-hidden="true" />
              {amplified ? 'Amplified' : 'Amplify'}
              <span className="tabular-nums opacity-70">{amplifies.toLocaleString()}</span>
            </Button>
            <Button
              onClick={handleClaim}
              disabled={!canClaim || isClaiming}
              className="flex-1 gap-2"
            >
              <Handshake className="size-4" aria-hidden="true" />
              {issue.restricted
                ? 'Locked'
                : issue.responder
                  ? 'Claimed'
                  : claimed
                    ? 'Claim sent ✓'
                    : isClaiming
                      ? 'Sending…'
                      : 'Claim & Act'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
