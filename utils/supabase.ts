import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// This side-effect import installs the global `localStorage` Supabase's auth client persists
// sessions through. Without it, `persistSession: true` below has nowhere durable to write,
// `signInAnonymously()` (services/authService.ts) would mint a brand new anonymous user on every
// cold start, and every previously-synced row would become invisible under RLS (each row's
// `user_id` would belong to a now-abandoned anonymous user).
//
// Guarded to native only: on web this file is also evaluated by `expo export -p web`'s static
// prerender, which runs the whole route tree in a plain Node process — no browser, no RN host.
// Requiring expo-sqlite's native bindings there throws and fails the export, so on web we skip
// straight to whatever `localStorage` the environment already provides (real one in the browser,
// none during prerender — see the `typeof` guard below).
if (Platform.OS !== 'web') {
  require('expo-sqlite/localStorage/install');
}

// Expo inlines EXPO_PUBLIC_-prefixed vars into the client bundle at build time — set these in
// a .env.local file (EXPO_PUBLIC_SUPABASE_URL=..., EXPO_PUBLIC_SUPABASE_ANON_KEY=...) rather than
// committing real values here. Get both from Project Settings > API in the Supabase dashboard.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// `typeof` (not a bare reference) so this never throws in the Node prerender process, which has
// no `localStorage` global at all.
const storage = typeof localStorage !== 'undefined' ? localStorage : undefined;

// Storage bucket ("receipts", private) and "transactions" table (with RLS keyed off auth.uid())
// are provisioned directly via SQL in the Supabase dashboard — see services/databaseService.ts
// for the exact schema this client's queries assume.
//
// Every user is anonymous (services/authService.ts signs one in silently at boot, gated locally
// by components/ui/BiometricLock.tsx) rather than logged in, but RLS still needs a stable
// `auth.uid()` per device — hence persisting the session instead of Phase 12's `persistSession: false`.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    persistSession: !!storage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
