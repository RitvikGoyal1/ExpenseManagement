import { create } from 'zustand';

import { IncomeType } from '@/types/onboarding';

interface OnboardingStore {
  /** Mocked first-launch flag — no persistence yet, so it resets on every app reload. */
  hasCompletedOnboarding: boolean;
  incomeType: IncomeType | null;
  setIncomeType: (incomeType: IncomeType) => void;
  completeOnboarding: () => void;
  /** Drops back to the onboarding flow — used by the "Reset App Data" flow. */
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  hasCompletedOnboarding: false,
  incomeType: null,
  setIncomeType: (incomeType) => set({ incomeType }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  resetOnboarding: () => set({ hasCompletedOnboarding: false, incomeType: null }),
}));
