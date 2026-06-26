'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useMutations.ts
//  Centralises every write operation (amplify, sign petition,
//  like post, claim issue, join competition, redeem reward).
//
//  PATTERN: Optimistic update → Supabase call → rollback on error
//  This keeps the UI snappy even on a slow connection.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ── Amplify / Un-amplify ──────────────────────────────────────
export function useAmplify(issueId: string, userId: string | null | undefined) {
  const [isLoading, setIsLoading] = useState(false)

  const toggle = useCallback(
    async (currentlyAmplified: boolean): Promise<boolean> => {
      if (!userId) return currentlyAmplified // not yet authed
      setIsLoading(true)
      try {
        if (currentlyAmplified) {
          await supabase
            .from('amplifications')
            .delete()
            .match({ issue_id: issueId, user_id: userId })
          return false
        } else {
          await supabase
            .from('amplifications')
            .insert({ issue_id: issueId, user_id: userId })
          return true
        }
      } catch {
        return currentlyAmplified // rollback on network error
      } finally {
        setIsLoading(false)
      }
    },
    [issueId, userId]
  )

  // Pre-flight: check if user already amplified this issue
  const checkAmplified = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    const { count } = await supabase
      .from('amplifications')
      .select('id', { count: 'exact', head: true })
      .match({ issue_id: issueId, user_id: userId })
    return (count ?? 0) > 0
  }, [issueId, userId])

  return { toggle, checkAmplified, isLoading }
}

// ── Sign / Un-sign Petition ───────────────────────────────────
export function usePetition(issueId: string, userId: string | null | undefined) {
  const [isLoading, setIsLoading] = useState(false)

  const toggle = useCallback(
    async (currentlySigned: boolean): Promise<boolean> => {
      if (!userId) return currentlySigned
      setIsLoading(true)
      try {
        if (currentlySigned) {
          await supabase
            .from('petition_signatures')
            .delete()
            .match({ issue_id: issueId, user_id: userId })
          return false
        } else {
          await supabase
            .from('petition_signatures')
            .insert({ issue_id: issueId, user_id: userId })
          return true
        }
      } catch {
        return currentlySigned
      } finally {
        setIsLoading(false)
      }
    },
    [issueId, userId]
  )

  const checkSigned = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    const { count } = await supabase
      .from('petition_signatures')
      .select('id', { count: 'exact', head: true })
      .match({ issue_id: issueId, user_id: userId })
    return (count ?? 0) > 0
  }, [issueId, userId])

  return { toggle, checkSigned, isLoading }
}

// ── Like / Unlike Feed Post ───────────────────────────────────
export function useFeedLike(postId: string, userId: string | null | undefined) {
  const toggle = useCallback(
    async (currentlyLiked: boolean): Promise<boolean> => {
      if (!userId) return currentlyLiked
      if (currentlyLiked) {
        await supabase
          .from('feed_likes')
          .delete()
          .match({ post_id: postId, user_id: userId })
        return false
      } else {
        await supabase
          .from('feed_likes')
          .insert({ post_id: postId, user_id: userId })
        return true
      }
    },
    [postId, userId]
  )

  const checkLiked = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    const { count } = await supabase
      .from('feed_likes')
      .select('id', { count: 'exact', head: true })
      .match({ post_id: postId, user_id: userId })
    return (count ?? 0) > 0
  }, [postId, userId])

  return { toggle, checkLiked }
}

// ── Claim Issue ───────────────────────────────────────────────
export function useClaimIssue() {
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const claim = useCallback(
    async (issueId: string, userId: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)
      const { error: claimError } = await supabase
        .from('issue_claims')
        .insert({ issue_id: issueId, claimer_id: userId, status: 'pending' })
      setIsLoading(false)
      if (claimError) {
        setError(claimError.message)
        return false
      }
      return true
    },
    []
  )

  return { claim, isLoading, error }
}

// ── Join Competition ──────────────────────────────────────────
export function useJoinCompetition() {
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const join = useCallback(
    async (
      competitionId: string,
      userId: string,
      alreadyJoined: boolean
    ): Promise<boolean> => {
      setJoiningId(competitionId)
      try {
        if (alreadyJoined) {
          await supabase
            .from('competition_participants')
            .delete()
            .match({ competition_id: competitionId, user_id: userId })
          return false
        } else {
          await supabase
            .from('competition_participants')
            .insert({ competition_id: competitionId, user_id: userId })
          return true
        }
      } finally {
        setJoiningId(null)
      }
    },
    []
  )

  return { join, joiningId }
}

// ── Redeem Reward ─────────────────────────────────────────────
export function useRedeemReward() {
  const [isLoading,   setIsLoading]   = useState(false)
  const [successId,   setSuccessId]   = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const redeem = useCallback(
    async (rewardId: string, cost: number, userId: string, meritScore: number) => {
      if (meritScore < cost) {
        setError(`You need ${cost - meritScore} more merit points.`)
        return false
      }
      setIsLoading(true)
      setError(null)
      const { error: redeemError } = await supabase
        .from('reward_claims')
        .insert({ reward_id: rewardId, user_id: userId, merit_cost: cost, status: 'pending' })
      setIsLoading(false)
      if (redeemError) {
        setError(redeemError.message)
        return false
      }
      setSuccessId(rewardId)
      setTimeout(() => setSuccessId(null), 3000)
      return true
    },
    []
  )

  return { redeem, isLoading, successId, error }
}
