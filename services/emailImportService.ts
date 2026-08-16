import { DeductionCategory, Transaction, TransactionCategory } from '@/types/transaction';

interface HistoricalEntry {
  merchant: string;
  category: TransactionCategory;
  amount: number;
  daysAgo: number;
  isDeductible?: boolean;
  deductionCategory?: DeductionCategory;
}

// A realistic 3-month spread of Uber rides, software subscriptions,
// groceries, and flights — the mix called out in the product spec. Software
// subscriptions and flights (~30% of the set) come back auto-flagged as
// deductible business expenses, the rest as ordinary personal spend.
const MOCK_HISTORY: HistoricalEntry[] = [
  { merchant: 'Uber', category: 'Transport', amount: -14.5, daysAgo: 2 },
  { merchant: 'Whole Foods Market', category: 'Food & Dining', amount: -86.32, daysAgo: 5 },
  { merchant: 'Spotify', category: 'Entertainment', amount: -11.99, daysAgo: 9 },
  { merchant: 'Uber', category: 'Transport', amount: -22.1, daysAgo: 13 },
  {
    merchant: 'Adobe Creative Cloud',
    category: 'Bills & Utilities',
    amount: -54.99,
    daysAgo: 17,
    isDeductible: true,
    deductionCategory: 'Software & Subscriptions',
  },
  { merchant: "Trader Joe's", category: 'Food & Dining', amount: -63.47, daysAgo: 21 },
  {
    merchant: 'Delta Air Lines',
    category: 'Transport',
    amount: -318.4,
    daysAgo: 26,
    isDeductible: true,
    deductionCategory: 'Travel',
  },
  { merchant: 'Uber', category: 'Transport', amount: -9.75, daysAgo: 31 },
  {
    merchant: 'Notion',
    category: 'Bills & Utilities',
    amount: -10.0,
    daysAgo: 35,
    isDeductible: true,
    deductionCategory: 'Software & Subscriptions',
  },
  { merchant: 'Spotify', category: 'Entertainment', amount: -11.99, daysAgo: 39 },
  { merchant: 'Safeway', category: 'Food & Dining', amount: -71.85, daysAgo: 44 },
  {
    merchant: 'Adobe Creative Cloud',
    category: 'Bills & Utilities',
    amount: -54.99,
    daysAgo: 48,
    isDeductible: true,
    deductionCategory: 'Software & Subscriptions',
  },
  {
    merchant: 'Southwest Airlines',
    category: 'Transport',
    amount: -212.6,
    daysAgo: 58,
    isDeductible: true,
    deductionCategory: 'Travel',
  },
  { merchant: 'Whole Foods Market', category: 'Food & Dining', amount: -84.1, daysAgo: 71 },
  { merchant: 'Uber', category: 'Transport', amount: -12.4, daysAgo: 79 },
];

export const MOCK_IMPORT_COUNT = MOCK_HISTORY.length;

const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 4000;

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Stands in for scanning a connected inbox for past receipts. Resolves
 * with a fixed set of historical transactions spanning the last ~3 months,
 * dated relative to "now" so the spread always looks current.
 */
export async function simulateInboxImport(): Promise<Transaction[]> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

  return new Promise((resolve) => {
    setTimeout(() => {
      const transactions: Transaction[] = MOCK_HISTORY.map((entry, index) => ({
        id: `import_${index}_${Date.now()}`,
        merchant: entry.merchant,
        category: entry.category,
        amount: entry.amount,
        date: isoDaysAgo(entry.daysAgo),
        isDeductible: entry.isDeductible ?? false,
        deductionCategory: entry.deductionCategory,
      }));
      resolve(transactions);
    }, delay);
  });
}
