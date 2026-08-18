export type TransactionCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Bills & Utilities'
  | 'Entertainment'
  | 'Health'
  | 'Income'
  | 'Other';

/** Labels shown when a transaction is manually or automatically flagged deductible. */
export type DeductionCategory =
  | 'Business Expense'
  | 'Home Office'
  | 'Travel'
  | 'Software & Subscriptions'
  | 'Other';

export const DEDUCTION_CATEGORIES: DeductionCategory[] = [
  'Business Expense',
  'Home Office',
  'Travel',
  'Software & Subscriptions',
  'Other',
];

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Income',
  'Other',
];

/** A single purchased item extracted from a receipt (Gemini OCR) — description + its own price. */
export interface LineItem {
  description: string;
  price: number;
}

export interface Transaction {
  id: string;
  merchant: string;
  category: TransactionCategory;
  /** Positive for income, negative for an expense. */
  amount: number;
  /** ISO 8601 date string. */
  date: string;
  /** Whether this is a potential tax deduction — AI-flagged or user-corrected. */
  isDeductible: boolean;
  /** Only meaningful when isDeductible is true. */
  deductionCategory?: DeductionCategory;
  /** Supabase Storage object path for the scanned receipt — undefined for a manual entry. */
  imagePath?: string;
  /** Individual items Gemini read off the receipt — undefined/empty for manual entries or an unreadable receipt. */
  lineItems?: LineItem[];
}

export type SummaryPeriod = 'week' | 'month' | 'year' | 'all';

export interface PeriodSummary {
  period: SummaryPeriod;
  label: string;
  income: number;
  expenses: number;
  previousExpenses: number;
  /** False for 'all' — there's no prior all-time bucket to compare against. */
  hasComparison: boolean;
}
