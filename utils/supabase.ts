// Must run before createClient — this side-effect import installs the global `localStorage`
// Supabase's auth client persists sessions through. Without it, `persistSession: true` below has
// nowhere durable to write, `signInAnonymously()` (services/authService.ts) would mint a brand new
// anonymous user on every cold start, and every previously-synced row would become invisible under
// RLS (each row's `user_id` would belong to a now-abandoned anonymous user).
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

// Expo inlines EXPO_PUBLIC_-prefixed vars into the client bundle at build time — set these in
// a .env.local file (EXPO_PUBLIC_SUPABASE_URL=..., EXPO_PUBLIC_SUPABASE_ANON_KEY=...) rather than
// committing real values here. Get both from Project Settings > API in the Supabase dashboard.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Storage bucket ("receipts", private) and "transactions" table (with RLS keyed off auth.uid())
// are provisioned directly via SQL in the Supabase dashboard — see services/databaseService.ts
// for the exact schema this client's queries assume.
//
// Every user is anonymous (services/authService.ts signs one in silently at boot, gated locally
// by components/ui/BiometricLock.tsx) rather than logged in, but RLS still needs a stable
// `auth.uid()` per device — hence persisting the session instead of Phase 12's `persistSession: false`.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
