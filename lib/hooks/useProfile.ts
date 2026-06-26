'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useProfile.ts
//  Loads the current user's profile and subscribes to real-time
//  changes (merit score, tier, stat counters).
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapProfile, type MappedProfile } from '@/lib/utils/mappers'
import type { ProfileRow } from '@/lib/database.types'

// Static fallback — mirrors the original mock data so the UI
// never renders an empty state on first load.
const FALLBACK_PROFILE: MappedProfile = {
  name:       'Citizen',
  handle:     '@citizen',
  avatar:     '/avatars/user.png',
  tier:       'Level 1 · New Citizen',
  meritScore: 0,
  nextTierAt: 500,
  stats: { reported: 0, amplified: 0, resolved: 0 },
}

interface UseProfileReturn {
  profile: MappedProfile
  loading: boolean
  error:   string | null
}

export function useProfile(userId: string | null | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<MappedProfile>(FALLBACK_PROFILE)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    let mounted = true

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!mounted) return
        if (fetchError) {
          setError(fetchError.message)
        } else if (data) {
          setProfile(mapProfile(data))
        }
        setLoading(false)
      })

    // Live updates — merit score changes fire from DB triggers
    const channel = supabase.channel(`profile-${userId}`);

channel.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
  (payload) => {
    if (mounted) setProfile(mapProfile(payload.new as ProfileRow))
  }
);

channel.subscribe();

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { profile, loading, error }
}
