import { supabase } from '@/utils/supabase';

/**
 * Ensures a Supabase auth session exists before any RLS-gated request runs. Silent by design — no
 * form, no redirect — signInAnonymously() needs nothing from the user. This is entirely separate
 * from components/ui/BiometricLock.tsx: that's a local, offline "is this person allowed to hold
 * the phone" gate, while this is the network identity RLS checks `auth.uid()` against.
 *
 * Because utils/supabase.ts persists the session (via expo-sqlite's localStorage shim), this only
 * actually calls signInAnonymously() once per install. Every later boot finds that same anonymous
 * user's session already on disk, so rows written under it stay visible instead of orphaning behind
 * a fresh `auth.uid()` on every cold start.
 */
export async function initializeAnonymousSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return;
  }

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }
}
