'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useIssues.ts
//  Fetches the issue list and maintains a real-time Supabase
//  channel so amplify counts and status changes update live
//  without any polling.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapIssue, type MappedIssue } from '@/lib/utils/mappers'
import type { IssueRow } from '@/lib/database.types'

interface UseIssuesReturn {
  issues:  MappedIssue[]
  loading: boolean
  error:   string | null
  refresh: () => void
}

export function useIssues(): UseIssuesReturn {
  const [issues,  setIssues]  = useState<MappedIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // Use the recommendation algorithm if available
    // Default location (Indiranagar, BLR) if no user GPS is currently accessible
    const mockLat = 12.9784
    const mockLng = 77.6408

    const { data, error: fetchError } = await supabase
      .rpc('recommend_issues', {
        p_user_id: null,
        p_lat: mockLat,
        p_lon: mockLng,
        p_limit: 50
      })

    // Fallback to regular query if RPC is not deployed yet or fails
    if (fetchError || !data) {
      console.warn("Recommendation RPC failed, falling back to basic query:", fetchError)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('issues')
        .select('*')
        .order('amplifies_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (fallbackError) {
        setError(fallbackError.message)
      } else {
        setIssues((fallbackData ?? []).map(mapIssue))
      }
    } else {
      setIssues((data ?? []).map(mapIssue))
    }
    
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIssues()

    // ── Real-time channel ────────────────────────────────────
    // Subscribe to any UPDATE on the issues table.
    // When an amplification trigger fires and updates
    // amplifies_count, this event pushes the new row to us.
    const channel = supabase
      .channel(`issues-live-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues' },
        (payload) => {
          const updated = mapIssue(payload.new as IssueRow)
          setIssues((prev) =>
            prev.map((issue) => (issue.id === updated.id ? updated : issue))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issues' },
        (payload) => {
          const newIssue = mapIssue(payload.new as IssueRow)
          setIssues((prev) => [newIssue, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchIssues])

  return { issues, loading, error, refresh: fetchIssues }
}

// ── Single issue detail ───────────────────────────────────────
export function useIssue(id: string) {
  const [issue,   setIssue]   = useState<MappedIssue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setIssue(data ? mapIssue(data) : null)
        setLoading(false)
      })

    const channel = supabase
      .channel(`issue-${id}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues', filter: `id=eq.${id}` },
        (payload) => setIssue(mapIssue(payload.new as IssueRow))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  return { issue, loading }
}
