'use client'
// ─────────────────────────────────────────────────────────────
//  RewardsTab — PLUMBING ONLY. Zero UI changes.
//  useRewards() replaces static competition/reward imports.
//  useJoinCompetition() wires the Join button to Supabase.
//  Merit score circle reads live from useProfile().
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
  Coffee, Gift, Leaf, Shirt, Ticket, TrendingUp, Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRewards } from '@/lib/hooks/useRewards'
import { useProfile } from '@/lib/hooks/useProfile'
import { useJoinCompetition, useRedeemReward } from '@/lib/hooks/useMutations'
import { useAppContext } from '@/providers/AppProviders'
import type { MappedReward } from '@/lib/utils/mappers'

// ── Icon map (identical to original) ─────────────────────────
const rewardIcons: Record<MappedReward['icon'], typeof Gift> = {
  coffee: Coffee,
  ticket: Ticket,
  leaf:   Leaf,
  gift:   Gift,
  shirt:  Shirt,
}

// ── Circular merit score (identical to original) ──────────────
function CircularScore({ score, max }: { score: number; max: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(score / max, 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="relative grid size-44 place-items-center">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={radius} fill="none"
          stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">{score.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">Merit Score</span>
      </div>
    </div>
  )
}

// ── Skeleton strips (non-intrusive loading) ───────────────────
function CompSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="h-28 bg-secondary/40" />
      <div className="p-4">
        <div className="h-4 w-3/4 rounded bg-secondary/60" />
        <div className="mt-1.5 h-3 w-1/2 rounded bg-secondary/40" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-secondary/40" />
          <div className="h-8 w-24 rounded-full bg-secondary/60" />
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function RewardsTab() {
  const { user } = useAppContext()
  const { profile }                        = useProfile(user?.id)
  const { competitions, rewards, joinedIds, loading } = useRewards(user?.id)
  const { join, joiningId }                = useJoinCompetition()
  const { redeem, successId }              = useRedeemReward()

  const [localJoinedIds, setLocalJoinedIds] = useState<Set<string>>(new Set())

  const remaining = Math.max(0, profile.nextTierAt - profile.meritScore)

  async function handleJoin(compId: string) {
    if (!user?.id) return
    const isJoined = joinedIds.has(compId) || localJoinedIds.has(compId)
    const success = await join(compId, user.id, isJoined)
    if (success !== undefined) {
      setLocalJoinedIds(prev => {
        const next = new Set(prev)
        if (success) next.add(compId)
        else next.delete(compId)
        return next
      })
    }
  }

  return (
    <section className="px-4 py-5">
      <h2 className="text-base font-semibold tracking-tight">Rewards &amp; CSR</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Earn merit for civic action, unlock real rewards
      </p>

      {/* Merit Score */}
      <Card className="items-center gap-2 border-border/60 bg-gradient-to-b from-primary/10 to-card p-6">
        <CircularScore score={profile.meritScore} max={profile.nextTierAt} />
        <p className="text-sm font-medium">{profile.tier}</p>
        <p className="text-xs text-muted-foreground">
          {remaining.toLocaleString()} pts to next tier
        </p>
      </Card>

      {/* Brand competitions */}
      <div className="mb-3 mt-7 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Brand Competitions</h3>
        <span className="text-xs text-muted-foreground">Sponsored drives</span>
      </div>
      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 2 }, (_, i) => <CompSkeleton key={i} />)
          : competitions.map((c) => {
              const joined    = joinedIds.has(c.id) || localJoinedIds.has(c.id)
              const isJoining = joiningId === c.id
              return (
                <Card
                  key={c.id}
                  className="gap-0 overflow-hidden border-border/60 bg-card p-0"
                >
                  <div className="relative h-28 w-full overflow-hidden">
                    <img src={c.image || '/placeholder.svg'} alt="" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                    <Badge className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
                      {c.daysLeft}d left
                    </Badge>
                  </div>
                  <div className="p-4 pt-3">
                    <p className="text-sm font-semibold leading-snug">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Sponsored by {c.sponsor}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3.5" aria-hidden="true" />
                        {c.participants.toLocaleString()} joined
                      </span>
                      <Button
                        size="sm"
                        variant={joined ? 'secondary' : 'default'}
                        disabled={isJoining}
                        onClick={() => handleJoin(c.id)}
                        className="h-8 rounded-full px-4 text-xs font-semibold"
                      >
                        {isJoining ? '…' : joined ? `Joined · ${c.points} pts` : `Join · ${c.points} pts`}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
      </div>

      {/* Unlockable gifts */}
      <div className="mb-3 mt-7 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Claim with Merit</h3>
        <TrendingUp className="size-4 text-primary" aria-hidden="true" />
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-36 shrink-0 animate-pulse rounded-xl border border-border/60 bg-card p-4">
                <div className="mx-auto mb-2 size-12 rounded-full bg-secondary/60" />
                <div className="mx-auto h-3 w-24 rounded bg-secondary/60" />
                <div className="mx-auto mt-2 h-5 w-16 rounded-full bg-secondary/40" />
              </div>
            ))
          : rewards.map((r) => {
              const Icon = rewardIcons[r.icon] ?? Gift
              const canAfford = profile.meritScore >= r.cost
              const isSuccess = successId === r.id
              return (
                <Card
                  key={r.id}
                  onClick={() => {
                    if (canAfford && user?.id) redeem(r.id, r.cost, user.id, profile.meritScore)
                  }}
                  className={`w-36 shrink-0 items-center gap-2 border-border/60 bg-card p-4 text-center ${canAfford ? 'cursor-pointer hover:border-primary/50' : 'opacity-70'}`}
                >
                  <div className={`flex size-12 items-center justify-center rounded-full ${canAfford ? 'bg-primary/15 text-primary' : 'bg-secondary/60 text-muted-foreground'}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-medium leading-snug">{r.name}</p>
                  <Badge className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isSuccess ? 'bg-green-500/20 text-green-500' : canAfford ? 'bg-secondary text-secondary-foreground' : 'bg-secondary/40 text-muted-foreground'}`}>
                    {isSuccess ? 'Redeemed ✓' : `${r.cost} pts`}
                  </Badge>
                </Card>
              )
            })}
      </div>
    </section>
  )
}
