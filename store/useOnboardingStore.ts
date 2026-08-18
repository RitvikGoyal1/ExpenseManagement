// Must run before the store below ever touches `localStorage` — same reasoning as
// utils/supabase.ts. Duplicated here (a bare side-effect import is idempotent) rather than relying
// on that file having already run first, since module evaluation order across the app isn't
// guaranteed.
import 'expo-sqlite/localStorage/install';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { IncomeType } from '@/types/onboarding';

interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  incomeType: IncomeType | null;
  /** Set via the "Mock?" checkbox on the first onboarding screen. When false, the app starts with zero accounts and zero data instead of the seeded demo content. */
  useMockData: boolean;
  /** True once the persisted state has been read back from disk — see the note on _layout.tsx's splash-screen gate for why this matters. */
  hasHydrated: boolean;
  setIncomeType: (incomeType: IncomeType) => void;
  setUseMockData: (useMockData: boolean) => void;
  completeOnboarding: () => void;
  /** Drops back to the onboarding flow — used by the "Reset App Data" flow. */
  resetOnboarding: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      incomeType: null,
      useMockData: false,
      hasHydrated: false,
      setIncomeType: (incomeType) => set({ incomeType }),
      setUseMockData: (useMockData) => set({ useMockData }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, incomeType: null, useMockData: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => localStorage),
      // hasHydrated is a load-time signal, not user data — persisting it would mean it reads back
      // as stale-true from a previous session before this session's own hydration has even run.
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        incomeType: state.incomeType,
        useMockData: state.useMockData,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[useOnboardingStore] Failed to rehydrate persisted onboarding state:', error);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);
