'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useFeedPosts.ts
//  Fetches the civic feed and subscribes to real-time like
//  count updates so the counter ticks live across devices.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { mapFeedPost, type MappedFeedPost } from '@/lib/utils/mappers'
import type { FeedPostRow } from '@/lib/database.types'

interface UseFeedPostsReturn {
  posts:   MappedFeedPost[]
  loading: boolean
  error:   string | null
  refresh: () => void
}

export function useFeedPosts(): UseFeedPostsReturn {
  const [posts,   setPosts]   = useState<MappedFeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPosts((data ?? []).map(mapFeedPost))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()

    // Subscribe to like-count changes (triggered by feed_likes inserts/deletes)
    const channel = supabase
      .channel('feed-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const updated = mapFeedPost(payload.new as FeedPostRow)
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const newPost = mapFeedPost(payload.new as FeedPostRow)
          setPosts((prev) => [newPost, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchPosts])

  return { posts, loading, error, refresh: fetchPosts }
}
