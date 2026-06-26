'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useRewards.ts
//  Loads active competitions and available rewards.
//  Tracks which competitions the current user has joined.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapCompetition, mapReward, type MappedCompetition, type MappedReward } from '@/lib/utils/mappers'
import {
  competitions as fallbackCompetitions,
  rewards as fallbackRewards,
} from '@/lib/civic-data'

interface UseRewardsReturn {
  competitions:     MappedCompetition[]
  rewards:          MappedReward[]
  joinedIds:        Set<string>
  loading:          boolean
  error:            string | null
  refresh:          () => void
}

export function useRewards(userId: string | null | undefined): UseRewardsReturn {
  const [competitions, setCompetitions] = useState<MappedCompetition[]>(
    fallbackCompetitions as MappedCompetition[]
  )
  const [rewards,      setRewards]      = useState<MappedReward[]>(
    fallbackRewards as MappedReward[]
  )
  const [joinedIds,    setJoinedIds]    = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [compsResult, rewardsResult, participationsResult] = await Promise.all([
        supabase.from('competitions').select('*').eq('is_active', true).order('ends_at'),
        supabase.from('rewards').select('*').eq('is_available', true).order('cost'),
        userId
          ? supabase.from('competition_participants').select('competition_id').eq('user_id', userId)
          : Promise.resolve({ data: [] as { competition_id: string }[], error: null }),
      ])

      if (compsResult.error)   setError(compsResult.error.message)
      if (rewardsResult.error) setError(rewardsResult.error.message)

      const nextCompetitions = (compsResult.data ?? []).map(mapCompetition)
      const nextRewards = (rewardsResult.data ?? []).map(mapReward)

      setCompetitions(nextCompetitions.length ? nextCompetitions : fallbackCompetitions as MappedCompetition[])
      setRewards(nextRewards.length ? nextRewards : fallbackRewards as MappedReward[])
      setJoinedIds(new Set((participationsResult.data ?? []).map((p) => p.competition_id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rewards unavailable')
      setCompetitions(fallbackCompetitions as MappedCompetition[])
      setRewards(fallbackRewards as MappedReward[])
      setJoinedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()

    // Live participant-count updates
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
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
    } catch {
      channel = null
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchData])

  return { competitions, rewards, joinedIds, loading, error, refresh: fetchData }
}
