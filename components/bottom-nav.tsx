"use client"

import { Map, Newspaper, Trophy, User } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabKey = "home" | "feed" | "rewards" | "profile"

const items: { key: TabKey; label: string; icon: typeof Map }[] = [
  { key: "home", label: "Home", icon: Map },
  { key: "feed", label: "Feed", icon: Newspaper },
  { key: "rewards", label: "Rewards", icon: Trophy },
  { key: "profile", label: "Profile", icon: User },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/60 bg-background/90 backdrop-blur-md"
    >
      <ul className="flex items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const isActive = active === item.key
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("size-5", isActive && "drop-shadow-[0_0_6px_var(--primary)]")}
                  aria-hidden="true"
                />
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
