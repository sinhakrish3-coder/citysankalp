"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { BottomNav, type TabKey } from "@/components/bottom-nav"
import { HomeTab } from "@/components/tabs/home-tab"
import { FeedTab } from "@/components/tabs/feed-tab"
import { RewardsTab } from "@/components/tabs/rewards-tab"
import { ProfileTab } from "@/components/tabs/profile-tab"

export default function Page() {
  const [tab, setTab] = useState<TabKey>("home")

  return (
    <div className="min-h-dvh bg-background">
      <main className="relative mx-auto min-h-dvh w-full max-w-md border-x border-border/40 bg-background pb-20">
        <AppHeader activeTab={tab} />

        {tab === "home" && <HomeTab />}
        {tab === "feed" && <FeedTab />}
        {tab === "rewards" && <RewardsTab />}
        {tab === "profile" && <ProfileTab />}

        <BottomNav active={tab} onChange={setTab} />
      </main>
    </div>
  )
}
