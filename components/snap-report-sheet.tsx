'use client'

import { useState } from 'react'
import { Camera, Loader2, MapPin } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useAppContext } from '@/providers/AppProviders'
import { categoryStyles, type IssueCategory } from '@/lib/issues'

interface SnapReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: IssueCategory[] = ['Road', 'Cleanliness', 'Water', 'Lighting', 'Safety', 'Parks']

export function SnapReportSheet({ open, onOpenChange }: SnapReportSheetProps) {
  const { user, profile } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState<IssueCategory>('Road')
  const [locality, setLocality] = useState('Indiranagar, BLR')
  const [imageFile, setImageFile] = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      let thumbnailUrl = null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('issue-images')
          .upload(filePath, imageFile)

        if (!uploadError) {
          const { data } = supabase.storage
            .from('issue-images')
            .getPublicUrl(filePath)
          thumbnailUrl = data.publicUrl
        }
      }

      const { error: insertError } = await supabase.from('issues').insert({
        title,
        summary,
        category,
        status: 'Open',
        locality,
        reported_by_id: user.id,
        reporter_name: profile?.display_name || 'Citizen',
        reporter_verified: profile?.is_verified || false,
        thumbnail_url: thumbnailUrl,
        display_distance: 'Nearby',
        petition_goal: 500,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
        // Reset form
        setTitle('')
        setSummary('')
        setCategory('Road')
        setLocality('Indiranagar, BLR')
        setImageFile(null)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to submit report')
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
          <SheetTitle>Snap & Report</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-center text-xs font-medium text-green-500">
              Issue reported successfully!
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken street light"
              className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Summary</label>
            <textarea
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide more details..."
              className="min-h-[80px] resize-none rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                    category === cat
                      ? categoryStyles[cat]
                      : 'bg-secondary/40 text-muted-foreground ring-border hover:bg-secondary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/20 py-2.5 pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Photo (Optional)</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 p-6 transition-colors hover:border-primary/50 hover:bg-secondary/40">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="size-6" />
                <span className="text-xs font-medium">
                  {imageFile ? imageFile.name : 'Tap to upload or take photo'}
                </span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading || success} className="mt-2 w-full font-semibold">
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Submit Report
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
