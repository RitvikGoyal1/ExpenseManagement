import { Transaction } from '@/types/transaction';

const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 3000;

type MockReceipt = Omit<Transaction, 'id' | 'date'>;

// A spread of receipt types the "OCR" can land on — roughly 30% are
// software/travel expenses the tax pipeline should auto-flag as deductible,
// mirroring the mix a real receipt inbox would produce.
const MOCK_RECEIPTS: MockReceipt[] = [
  { merchant: 'Local Grocery', category: 'Food & Dining', amount: -45.2, isDeductible: false },
  { merchant: 'Blue Bottle Coffee', category: 'Food & Dining', amount: -6.75, isDeductible: false },
  { merchant: 'Shell Gas Station', category: 'Transport', amount: -38.4, isDeductible: false },
  { merchant: 'Amazon', category: 'Shopping', amount: -29.99, isDeductible: false },
  { merchant: 'AMC Theatres', category: 'Entertainment', amount: -18.5, isDeductible: false },
  { merchant: 'CVS Pharmacy', category: 'Health', amount: -22.15, isDeductible: false },
  { merchant: 'Target', category: 'Shopping', amount: -54.3, isDeductible: false },
  {
    merchant: 'Adobe Creative Cloud',
    category: 'Bills & Utilities',
    amount: -54.99,
    isDeductible: true,
    deductionCategory: 'Software & Subscriptions',
  },
  {
    merchant: 'Delta Air Lines',
    category: 'Transport',
    amount: -284.5,
    isDeductible: true,
    deductionCategory: 'Travel',
  },
  {
    merchant: 'Notion',
    category: 'Bills & Utilities',
    amount: -10.0,
    isDeductible: true,
    deductionCategory: 'Software & Subscriptions',
  },
];

/**
 * Stands in for a real OCR/AI receipt-parsing call. Takes the captured
 * image URI and, after a network-like delay, resolves with the transaction
 * it "extracted" — picked from a mock receipt pool so repeated scans vary
 * and roughly 30% come back auto-flagged as tax deductible. Swap this out
 * for a real API call once the backend exists — callers only depend on the
 * returned Transaction shape.
 */
export async function simulateReceiptProcessing(_imageUri: string): Promise<Transaction> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  const receipt = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `txn_${Date.now()}`,
        date: new Date().toISOString(),
        ...receipt,
      });
    }, delay);
  });
}
