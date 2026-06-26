'use client'

import { useState } from 'react'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useAppContext } from '@/providers/AppProviders'

interface CreatePostSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePostSheet({ open, onOpenChange }: CreatePostSheetProps) {
  const { user, profile } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<'update' | 'before-after'>('update')
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [beforeImage, setBeforeImage] = useState('')
  const [afterImage, setAfterImage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from('feed_posts').insert({
        type,
        author_id: user.id,
        author_name: profile?.display_name || 'Citizen',
        author_handle: profile?.handle || '@citizen',
        author_avatar_url: profile?.avatar_url || null,
        body,
        title: type === 'before-after' ? title : null,
        image_url: type === 'update' ? imageUrl : null,
        before_image_url: type === 'before-after' ? beforeImage : null,
        after_image_url: type === 'before-after' ? afterImage : null,
      })

      if (insertError) throw insertError

      onOpenChange(false)
      // Reset form
      setBody('')
      setTitle('')
      setImageUrl('')
      setBeforeImage('')
      setAfterImage('')
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] max-w-md gap-0 overflow-y-auto rounded-t-3xl border-border/60 bg-card p-0"
      >
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle>Create Post</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 rounded-xl bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => setType('update')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${type === 'update' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setType('before-after')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${type === 'before-after' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Before & After
            </button>
          </div>

          {type === 'before-after' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Park Cleanup Success!"
                className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Body</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's happening in your city?"
              className="min-h-[100px] resize-none rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          {type === 'update' ? (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <ImageIcon className="size-3.5" /> Image URL (optional)
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <ImageIcon className="size-3.5" /> Before Image URL
                </label>
                <input
                  required
                  value={beforeImage}
                  onChange={(e) => setBeforeImage(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <ImageIcon className="size-3.5" /> After Image URL
                </label>
                <input
                  required
                  value={afterImage}
                  onChange={(e) => setAfterImage(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="mt-2 w-full font-semibold">
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Post to Feed
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
