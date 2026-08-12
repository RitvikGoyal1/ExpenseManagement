import { MonthlySummary, Transaction } from '@/types/transaction';

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    merchant: "Trader Joe's",
    category: 'Food & Dining',
    amount: -84.32,
    date: '2026-08-11T18:24:00Z',
  },
  {
    id: 'txn_2',
    merchant: 'Uber',
    category: 'Transport',
    amount: -18.5,
    date: '2026-08-10T09:02:00Z',
  },
  {
    id: 'txn_3',
    merchant: 'Acme Corp Payroll',
    category: 'Income',
    amount: 3200,
    date: '2026-08-08T00:00:00Z',
  },
  {
    id: 'txn_4',
    merchant: 'Con Edison',
    category: 'Bills & Utilities',
    amount: -142.11,
    date: '2026-08-05T12:00:00Z',
  },
];

export const mockMonthlySummary: MonthlySummary = {
  month: 'August 2026',
  income: 3200,
  expenses: 244.93,
  previousMonthExpenses: 279.6,
};
