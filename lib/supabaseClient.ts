// ─────────────────────────────────────────────────────────────
//  lib/supabaseClient.ts
//  Single shared Supabase client for the browser.
//  Import `supabase` everywhere — never call createClient() twice.
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Fallback to hardcoded values so Vercel's build never fails when env vars
// are not yet configured. Runtime env vars always take precedence.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mtkyjwmyyjbxiburqumh.supabase.co'
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_rSbTzWbyuezwm8CUBIr7dQ_Vmcq4eZE'

// Module-level singleton — safe in Next.js because each browser tab
// runs its own module scope. On the server the client is never used
// for authenticated calls (all our data components are "use client").
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 8 },
    },
    global: {
      headers: { 'x-app-name': 'city-sankalp' },
    },
  }
)
