'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useProfile.ts
//  Loads the current user's profile and subscribes to real-time
//  changes (merit score, tier, stat counters).
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapProfile, type MappedProfile } from '@/lib/utils/mappers'
import type { ProfileRow } from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { profile as fallbackProfile } from '@/lib/civic-data'

// Static fallback — mirrors the original mock data so the UI
// never renders an empty state on first load.
const FALLBACK_PROFILE: MappedProfile = {
  name:       fallbackProfile.name,
  handle:     fallbackProfile.handle,
  avatar:     fallbackProfile.avatar,
  tier:       fallbackProfile.tier,
  meritScore: fallbackProfile.meritScore,
  nextTierAt: fallbackProfile.nextTierAt,
  stats:      fallbackProfile.stats,
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

  // Store the channel in a ref so cleanup is always targeting the
  // exact same object even in React 18 Strict Mode (double-effect).
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) {
      setProfile(FALLBACK_PROFILE)
      setLoading(false)
      return
    }

    let mounted = true

    // ── Tear down any previous subscription immediately ───────
    // Prevents the "cannot add callbacks after subscribe()" error
    // that occurs when React 18 Strict Mode fires the effect twice.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // ── Initial fetch ─────────────────────────────────────────
    // .maybeSingle() returns { data: null, error: null } for zero
    // rows — no 406 HTTP error, no error state, no blank tab.
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
      .catch((err) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Profile unavailable')
        setProfile(FALLBACK_PROFILE)
        setLoading(false)
      })

    // ── Live updates — merit score changes fire from DB triggers ─
    // Build the channel first, then subscribe in one go.
    // Never call .on() after .subscribe() has been called.
    try {
      const channel = supabase
        .channel(`profile-${userId}`)
        .on(
          'postgres_changes',
          {
            event:  'UPDATE',
            schema: 'public',
            table:  'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (mounted) setProfile(mapProfile(payload.new as ProfileRow))
          }
        )
        .subscribe()

      channelRef.current = channel
    } catch {
      channelRef.current = null
    }

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])

  return { profile, loading, error }
}

