'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useRewards.ts
//  Loads active competitions and available rewards.
//  Tracks which competitions the current user has joined.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapCompetition, mapReward, type MappedCompetition, type MappedReward } from '@/lib/utils/mappers'

interface UseRewardsReturn {
  competitions:     MappedCompetition[]
  rewards:          MappedReward[]
  joinedIds:        Set<string>
  loading:          boolean
  error:            string | null
  refresh:          () => void
}

export function useRewards(userId: string | null | undefined): UseRewardsReturn {
  const [competitions, setCompetitions] = useState<MappedCompetition[]>([])
  const [rewards,      setRewards]      = useState<MappedReward[]>([])
  const [joinedIds,    setJoinedIds]    = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [compsResult, rewardsResult, participationsResult] = await Promise.all([
      supabase.from('competitions').select('*').eq('is_active', true).order('ends_at'),
      supabase.from('rewards').select('*').eq('is_available', true).order('cost'),
      userId
        ? supabase.from('competition_participants').select('competition_id').eq('user_id', userId)
        : Promise.resolve({ data: [] as { competition_id: string }[], error: null }),
    ])

    if (compsResult.error)   setError(compsResult.error.message)
    if (rewardsResult.error) setError(rewardsResult.error.message)

    setCompetitions((compsResult.data ?? []).map(mapCompetition))
    setRewards((rewardsResult.data ?? []).map(mapReward))
    setJoinedIds(new Set((participationsResult.data ?? []).map((p) => p.competition_id)))

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchData()

    // Live participant-count updates
    const channel = supabase
      .channel('competitions-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'competitions' },
        (payload) => {
          setCompetitions((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? mapCompetition(payload.new as Parameters<typeof mapCompetition>[0]) : c
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  return { competitions, rewards, joinedIds, loading, error, refresh: fetchData }
}
