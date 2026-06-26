'use client'

import { useState, useEffect } from 'react'
import { Bell, ShieldCheck, CheckCircle2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { supabase } from '@/lib/supabaseClient'
import { useAppContext } from '@/providers/AppProviders'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

interface NotificationsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const { user } = useAppContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return

    let mounted = true
    const fetchNotifications = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (mounted && data) {
        setNotifications(data as Notification[])
      }
      setLoading(false)
    }

    fetchNotifications()

    // Mark as read when opened
    const markRead = async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    }
    markRead()

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [open, user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[85vh] max-w-md flex-col gap-0 rounded-t-3xl border-border/60 bg-card p-0"
      >
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle className="flex items-center justify-between text-base font-semibold">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              Notifications
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-70">
              <CheckCircle2 className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">You're all caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors",
                  !n.is_read ? "bg-primary/5 border-primary/20" : "bg-card"
                )}
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold leading-tight text-foreground/90">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.is_read && (
                  <div className="ml-auto mt-2 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
