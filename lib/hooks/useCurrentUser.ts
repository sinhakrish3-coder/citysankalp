'use client'
// ─────────────────────────────────────────────────────────────
//  lib/hooks/useCurrentUser.ts
//  Ensures every visitor has a Supabase session (anonymous auth)
//  and a matching profile row. Returns the user's UUID and profile.
//
//  WHY ANONYMOUS AUTH:
//  The app needs a persistent user ID to track amplifications,
//  petition signatures, etc.  Anonymous auth provides this with
//  zero friction — no sign-up form required. The user can later
//  link an email or OAuth provider to upgrade their account.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { ProfileRow } from '@/lib/database.types'

interface CurrentUser {
  user:    User | null
  profile: ProfileRow | null
  loading: boolean
}

export function useCurrentUser(): CurrentUser {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        // 1. Check for an existing session
        const { data: { session } } = await supabase.auth.getSession()
        let currentUser = session?.user ?? null

        // 2. If no session, sign in anonymously (creates a real user row)
        if (!currentUser) {
          const { data, error } = await supabase.auth.signInAnonymously()
          if (error) {
            console.error('[CitySankalp] Anonymous sign-in failed:', error.message)
          } else {
            currentUser = data.user
          }
        }

        if (!mounted || !currentUser) { setLoading(false); return }
        setUser(currentUser)

        // 3. Fetch the profile the DB trigger created for us.
        //    .maybeSingle() returns { data: null, error: null } for zero rows
        //    (no 406 HTTP error) so new anonymous users don't crash the hook.
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profileError) {
          console.error('[CitySankalp] Profile fetch error:', profileError.message)
        }
        if (mounted) {
          setProfile(profileData ?? null)
          setLoading(false)
        }
      } catch (err) {
        console.error('[CitySankalp] Auth bootstrap failed:', err)
        if (!mounted) return
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    bootstrap()

    // Listen for auth changes (tab focus, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, profile, loading }
}
