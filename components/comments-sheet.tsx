'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabaseClient'
import { useAppContext } from '@/providers/AppProviders'

interface Comment {
  id: string
  body: string
  created_at: string
  profiles: {
    display_name: string
    handle: string
    avatar_url: string | null
  } | null
}

interface CommentsSheetProps {
  postId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommentsSheet({ postId, open, onOpenChange }: CommentsSheetProps) {
  const { user } = useAppContext()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    if (!open || !postId) return

    let mounted = true
    const fetchComments = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('feed_comments')
        .select(`
          id, body, created_at,
          profiles!user_id (display_name, handle, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      
      if (mounted && data) {
        setComments(data as any)
      }
      setLoading(false)
    }

    fetchComments()

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [postId, open])

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !postId || !newComment.trim()) return

    const txt = newComment.trim()
    setNewComment('')
    await supabase
      .from('feed_comments')
      .insert({ post_id: postId, user_id: user.id, body: txt })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[85vh] max-w-md flex-col gap-0 rounded-t-3xl border-border/60 bg-card p-0"
      >
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageCircle className="size-4 text-primary" />
            Comments
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first to reply!</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="size-8 border border-border/60">
                  <AvatarImage src={c.profiles?.avatar_url || '/placeholder.svg'} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {(c.profiles?.display_name?.slice(0, 2)) ?? 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-2xl rounded-tl-none bg-secondary/30 p-3 text-sm">
                  <p className="font-semibold text-xs mb-1 text-foreground/80">{c.profiles?.display_name}</p>
                  <p className="text-muted-foreground">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handlePostComment} className="flex items-center gap-2 border-t border-border/60 p-4">
          <input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..." 
            className="flex h-10 w-full rounded-full border border-border/60 bg-secondary/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={!newComment.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
