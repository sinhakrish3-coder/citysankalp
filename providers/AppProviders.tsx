'use client'
// ─────────────────────────────────────────────────────────────
//  providers/AppProviders.tsx
//  Wraps the app with a React Context that makes the current
//  user available to any component without prop-drilling.
//  Keeps auth bootstrap in one place, runs once on mount.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/database.types'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'

// ── Context shape ─────────────────────────────────────────────
interface AppContextValue {
  user:    User | null
  profile: ProfileRow | null
  loading: boolean
}

const AppContext = createContext<AppContextValue>({
  user:    null,
  profile: null,
  loading: true,
})

// ── Provider ──────────────────────────────────────────────────
export function AppProviders({ children }: { children: ReactNode }) {
  const auth = useCurrentUser()

  return (
    <AppContext.Provider value={auth}>
      {children}
    </AppContext.Provider>
  )
}

// ── Consumer hook ─────────────────────────────────────────────
export function useAppContext() {
  return useContext(AppContext)
}
