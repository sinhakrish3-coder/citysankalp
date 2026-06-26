'use client'
// ─────────────────────────────────────────────────────────────
//  ProfileTab — PLUMBING ONLY. Zero UI changes.
//  useProfile() replaces the static `profile` import.
//  Merit score animates live via real-time DB subscription.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import {
  BadgeCheck,
  Camera,
  Megaphone,
  CheckCircle2,
  Settings,
  Trophy,
  Users,
  Leaf,
  Building2,
  Recycle,
  LogOut,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useProfile } from '@/lib/hooks/useProfile'
import { useAppContext } from '@/providers/AppProviders'
import { supabase } from '@/lib/supabaseClient'
import { profile as fallbackProfile } from '@/lib/civic-data'

export function ProfileTab() {
  const { user } = useAppContext()
  const { profile, loading } = useProfile(user?.id)

  const stats = [
    { label: 'Issues Reported',    value: profile.stats.reported,  icon: Camera       },
    { label: 'Petitions Amplified', value: profile.stats.amplified, icon: Megaphone    },
    { label: 'Issues Resolved',    value: profile.stats.resolved,  icon: CheckCircle2 },
  ]

  // Compute remaining points to next tier
  const remaining = Math.max(0, profile.nextTierAt - profile.meritScore)

  // How many more resolved issues to hit Level 5?
  const resolvedToGuardian = Math.max(0, 20 - profile.stats.resolved)

  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name, merit_score, tier_label')
      .order('merit_score', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setLeaderboard(data?.length ? data : [{
          display_name: fallbackProfile.name,
          merit_score: fallbackProfile.meritScore,
          tier_label: fallbackProfile.tier,
        }])
      })
      .catch(() => {
        setLeaderboard([{
          display_name: fallbackProfile.name,
          merit_score: fallbackProfile.meritScore,
          tier_label: fallbackProfile.tier,
        }])
      })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut().catch(() => undefined)
    setSettingsOpen(false)
  }

  return (
    <section className="px-4 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight">Profile</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden="true" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>

      {/* Identity */}
      <Card className="items-center gap-2 border-border/60 bg-gradient-to-b from-primary/10 to-card p-6">
        <Avatar className="size-20 border-2 border-primary/40">
          <AvatarImage
            src={loading ? '/placeholder.svg' : (profile.avatar || '/placeholder.svg')}
            alt={profile.name}
          />
          <AvatarFallback className="bg-secondary text-lg">
            {profile.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center leading-tight">
          <h3 className="text-lg font-semibold">
            {loading ? (
              <span className="inline-block h-5 w-32 animate-pulse rounded bg-secondary/60" />
            ) : profile.name}
          </h3>
          <p className="text-xs text-muted-foreground">{profile.handle}</p>
        </div>
        <Badge className="gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          {profile.tier}
        </Badge>
      </Card>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="items-center gap-1 border-border/60 bg-card p-4 text-center"
          >
            <s.icon className="size-5 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold tabular-nums">
              {loading
                ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary/60" />
                : s.value}
            </span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {s.label}
            </span>
          </Card>
        ))}
      </div>

      {/* Credibility note */}
      <Card className="mt-4 flex-row items-center gap-3 border-border/60 bg-card p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <BadgeCheck className="size-5" aria-hidden="true" />
        </div>
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          Your reports carry higher trust weight. Resolve{' '}
          <span className="font-semibold text-foreground">
            {resolvedToGuardian > 0 ? `${resolvedToGuardian} more issues` : 'more issues'}
          </span>{' '}
          to reach{' '}
          <span className="font-semibold text-foreground">
            Level 5 · Civic Guardian
          </span>
          .{' '}
          {remaining > 0 && (
            <span className="text-muted-foreground">
              ({remaining.toLocaleString()} merit pts to next tier)
            </span>
          )}
        </p>
      </Card>

      {/* Leaderboard */}
      <div className="mt-7 mb-3 flex items-center gap-2">
        <Trophy className="size-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Top Citizens</h3>
      </div>
      <Card className="flex flex-col gap-0 overflow-hidden border-border/60 bg-card p-0">
        {leaderboard.map((u, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-border/40 p-3 last:border-0">
            <div className="flex items-center gap-3">
              <span className={`w-4 text-center text-sm font-bold ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>{idx + 1}</span>
              <div>
                <p className="text-sm font-medium leading-tight">{u.display_name ?? 'Citizen'}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{u.tier_label}</p>
              </div>
            </div>
            <Badge className="bg-secondary text-secondary-foreground">{u.merit_score} pts</Badge>
          </div>
        ))}
      </Card>

      {/* CSR Impact */}
      <div className="mt-7 mb-3 flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">CSR Impact</h3>
      </div>
      <Card className="grid grid-cols-2 gap-px overflow-hidden border-border/60 bg-border/60 p-0">
        <div className="flex flex-col items-center justify-center bg-card p-4 text-center">
          <CheckCircle2 className="mb-1 size-5 text-green-500" />
          <span className="text-lg font-bold">847</span>
          <span className="text-[10px] text-muted-foreground">Issues Resolved</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-card p-4 text-center">
          <Users className="mb-1 size-5 text-blue-500" />
          <span className="text-lg font-bold">12,450</span>
          <span className="text-[10px] text-muted-foreground">Citizens Engaged</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-card p-4 text-center">
          <Recycle className="mb-1 size-5 text-amber-500" />
          <span className="text-lg font-bold">23t</span>
          <span className="text-[10px] text-muted-foreground">Waste Cleared</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-card p-4 text-center">
          <Building2 className="mb-1 size-5 text-purple-500" />
          <span className="text-lg font-bold">6</span>
          <span className="text-[10px] text-muted-foreground">Active Brands</span>
        </div>
      </Card>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl border-border/60 bg-card p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Display Name</span>
              <span className="text-sm text-muted-foreground">{profile.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Handle</span>
              <span className="text-sm text-muted-foreground">{profile.handle}</span>
            </div>
            <Button variant="destructive" onClick={handleSignOut} className="w-full gap-2 mt-4">
              <LogOut className="size-4" />
              Sign Out
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-2">CitySankalp v1.0</p>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
