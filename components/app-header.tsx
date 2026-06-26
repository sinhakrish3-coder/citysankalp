'use client'

import { useState, useEffect } from 'react'
import { Bell, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TabKey } from "@/components/bottom-nav"
import { NotificationsSheet } from '@/components/notifications-sheet'
import { useAppContext } from '@/providers/AppProviders'
import { useProfile } from '@/lib/hooks/useProfile'
import { supabase } from '@/lib/supabaseClient'

// subtitles are now dynamic per-render inside the component

export function AppHeader({ activeTab = "home" }: { activeTab?: TabKey }) {
  const [open, setOpen] = useState(false)
  const { user } = useAppContext()
  const { profile } = useProfile(user?.id)
  const [hasUnread, setHasUnread] = useState(false)

  const subtitles: Record<TabKey, string> = {
    home:    "Indiranagar, BLR",
    feed:    "Community wins near you",
    rewards: "Your civic rewards",
    profile: profile.name !== 'Citizen' ? profile.name : "Your Profile",
  }

  useEffect(() => {
    if (!user) return

    const checkUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setHasUnread((count ?? 0) > 0)
    }

    checkUnread()

    const channel = supabase
      .channel(`header-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => checkUnread()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MapPinned className="size-5" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">
                CitySankalp
              </h1>
              <p className="text-xs text-muted-foreground">
                {subtitles[activeTab]}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="relative rounded-full text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-5" aria-hidden="true" />
            {hasUnread && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </header>
      <NotificationsSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
