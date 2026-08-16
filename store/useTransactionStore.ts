import { create } from 'zustand';

import { Transaction } from '@/types/transaction';

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  /** Replaces the transaction list wholesale — used by the retroactive inbox import. */
  importTransactions: (transactions: Transaction[]) => void;
  /** Merges a partial patch into an existing transaction, e.g. a manual correction. */
  updateTransaction: (id: string, updatedData: Partial<Transaction>) => void;
  /** Wipes all transactions — used by the "Reset App Data" flow. */
  resetTransactions: () => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  importTransactions: (transactions) => set({ transactions }),
  updateTransaction: (id, updatedData) =>
    set((state) => ({
      transactions: state.transactions.map((transaction) =>
        transaction.id === id ? { ...transaction, ...updatedData } : transaction,
      ),
    })),
  resetTransactions: () => set({ transactions: [] }),
}));
