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

  // Store the channel in a ref so cleanup is always targeting the
  // exact same object even in React 18 Strict Mode (double-effect).
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

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

    // ── Live updates — merit score changes fire from DB triggers ─
    // Build the channel first, then subscribe in one go.
    // Never call .on() after .subscribe() has been called.
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

