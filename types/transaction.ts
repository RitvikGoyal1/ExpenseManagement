export type TransactionCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Bills & Utilities'
  | 'Entertainment'
  | 'Health'
  | 'Income'
  | 'Other';

export interface Transaction {
  id: string;
  merchant: string;
  category: TransactionCategory;
  /** Positive for income, negative for an expense. */
  amount: number;
  /** ISO 8601 date string. */
  date: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  previousMonthExpenses: number;
}
