import { create } from 'zustand';

import { NetWorthItem } from '@/types/analytics';

interface NetWorthStore {
  items: NetWorthItem[];
  addItem: (item: NetWorthItem) => void;
  /** Replaces the item list wholesale — used to rehydrate from Supabase on boot. */
  importItems: (items: NetWorthItem[]) => void;
  /** Drops a single item locally — used by Settings' delete row (optimistic; the caller re-adds it via addItem if the matching remote delete fails). */
  removeItem: (id: string) => void;
  /** Wipes all items — used by the "Reset App Data" flow. */
  resetItems: () => void;
}

export const useNetWorthStore = create<NetWorthStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  importItems: (items) => set({ items }),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  resetItems: () => set({ items: [] }),
}));
