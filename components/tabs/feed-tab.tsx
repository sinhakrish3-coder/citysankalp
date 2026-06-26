'use client'
// ─────────────────────────────────────────────────────────────
//  FeedTab — PLUMBING ONLY. Zero UI changes.
//  useFeedPosts() replaces static feedPosts import.
//  useFeedLike() wires the heart button to Supabase.
//  Real-time subscription updates like counts live.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share2, Sparkles, PenLine } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useFeedPosts } from '@/lib/hooks/useFeedPosts'
import { useFeedLike } from '@/lib/hooks/useMutations'
import { useAppContext } from '@/providers/AppProviders'
import type { MappedFeedPost } from '@/lib/utils/mappers'
import { CreatePostSheet } from '@/components/create-post-sheet'
import { CommentsSheet } from '@/components/comments-sheet'
// ── Sub-components (markup identical to original) ─────────────

function PostHeader({ post }: { post: MappedFeedPost }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4">
      <Avatar className="size-9 border border-border/60">
        <AvatarImage src={post.avatar || '/placeholder.svg'} alt="" />
        <AvatarFallback className="bg-secondary text-xs">
          {post.author.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{post.author}</p>
        <p className="truncate text-xs text-muted-foreground">
          {post.handle} · {post.timeAgo}
        </p>
      </div>
      <Badge className="gap-1 rounded-full bg-primary/15 px-2 py-0 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/30">
        <Sparkles className="size-3" aria-hidden="true" />
        Civic Win
      </Badge>
    </div>
  )
}

function PostActions({
  postId,
  serverLikes,
  comments,
  onCommentClick,
}: {
  postId: string
  serverLikes: number
  comments: number
  onCommentClick: () => void
}) {
  const { user } = useAppContext()
  const { toggle, checkLiked } = useFeedLike(postId, user?.id)

  const [liked, setLiked] = useState(false)
  // Optimistic total = server value already includes this user's like if they
  // had liked before; we add 1 only when the user likes within this session.
  const [localOffset, setLocalOffset] = useState(0)

  // Hydrate liked state from DB on mount
  useEffect(() => {
    let mounted = true
    checkLiked().then((v) => {
      if (mounted) setLiked(v)
    })
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id])

  async function handleLike() {
    // Optimistic
    const next = !liked
    setLiked(next)
    setLocalOffset((v) => v + (next ? 1 : -1))
    // Persist
    const committed = await toggle(liked)
    if (committed !== next) {
      // Server disagreed — revert
      setLiked(committed)
      setLocalOffset((v) => v + (committed ? 1 : -1))
    }
  }

  const displayTotal = serverLikes + localOffset

  return (
    <div className="flex items-center gap-5 px-4 pb-4 pt-3 text-muted-foreground">
      <button
        type="button"
        onClick={handleLike}
        aria-pressed={liked}
        className={cn(
          'flex items-center gap-1.5 text-sm transition-colors',
          liked ? 'text-primary' : 'hover:text-foreground',
        )}
      >
        <Heart className={cn('size-4', liked && 'fill-current')} aria-hidden="true" />
        <span className="tabular-nums">{displayTotal.toLocaleString()}</span>
      </button>
      <button
        type="button"
        onClick={onCommentClick}
        className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        <span className="tabular-nums">{comments}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'CitySankalp Update', text: 'Check out this civic update!' }).catch(() => {})
          } else {
            alert('Share link copied to clipboard!')
          }
        }}
        className="ml-auto transition-colors hover:text-foreground"
        aria-label="Share"
      >
        <Share2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {[
        { src: before, label: 'Before' },
        { src: after,  label: 'After'  },
      ].map((img) => (
        <div key={img.label} className="relative aspect-[4/3] overflow-hidden">
          <img src={img.src || '/placeholder.svg'} alt={`${img.label} repair`} className="size-full object-cover" />
          <span
            className={cn(
              'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur',
              img.label === 'After'
                ? 'bg-primary/85 text-primary-foreground'
                : 'bg-background/70 text-foreground',
            )}
          >
            {img.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton (matches card dimensions) ───────────────────────

function FeedCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-3 p-4">
        <div className="size-9 rounded-full bg-secondary/60" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-32 rounded bg-secondary/60" />
          <div className="h-3 w-24 rounded bg-secondary/40" />
        </div>
      </div>
      <div className="aspect-[16/9] bg-secondary/40" />
      <div className="flex gap-4 px-4 py-3">
        <div className="h-4 w-12 rounded bg-secondary/40" />
        <div className="h-4 w-10 rounded bg-secondary/40" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function FeedTab() {
  const { posts, loading, error } = useFeedPosts()
  const [composeOpen, setComposeOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [activePostId, setActivePostId] = useState<string | null>(null)

  return (
    <section className="px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Civic Feed</h2>
          <p className="text-xs text-muted-foreground">
            Community wins &amp; ongoing repairs near you
          </p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
        >
          <PenLine className="size-5" />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
          Could not load feed: {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <FeedCardSkeleton key={i} />)
          : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-12 text-center">
                <Sparkles className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">No community updates yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Be the first to share a win!</p>
              </div>
            )
          : posts.map((post) => (
              <Card
                key={post.id}
                className="gap-0 overflow-hidden border-border/60 bg-card p-0"
              >
                <PostHeader post={post} />

                {post.type === 'before-after' ? (
                  <>
                    <h3 className="px-4 pb-2 pt-3 text-sm font-semibold leading-snug">
                      {post.title}
                    </h3>
                    <p className="px-4 pb-3 text-sm leading-relaxed text-muted-foreground">
                      {post.body}
                    </p>
                    <BeforeAfter before={post.beforeImage} after={post.afterImage} />
                  </>
                ) : (
                  <>
                    <p className="px-4 pb-3 pt-3 text-sm leading-relaxed text-muted-foreground">
                      {post.body}
                    </p>
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={post.image || '/placeholder.svg'}
                        alt={post.imageAlt}
                        className="size-full object-cover"
                      />
                    </div>
                  </>
                )}

                <PostActions
                  postId={post.id}
                  serverLikes={post.likes}
                  comments={post.comments}
                  onCommentClick={() => {
                    setActivePostId(post.id)
                    setCommentsOpen(true)
                  }}
                />
              </Card>
            ))}
      </div>
      
      <CreatePostSheet open={composeOpen} onOpenChange={setComposeOpen} />
      <CommentsSheet postId={activePostId} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </section>
  )
}
