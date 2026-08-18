import { chartPalette } from '@/constants/theme';
import { BalanceSheet, CashFlowSummary, SpendingCategory } from '@/types/analytics';
import { MonthlySummary, Transaction } from '@/types/transaction';

/**
 * Net worth needs actual account balances (cash, investments, mortgage, ...) — nothing this app
 * tracks anywhere. Rather than fabricate a number out of transaction history (which has no
 * relationship to net worth), real-data mode always shows this until account balances exist as a
 * real feature.
 */
export const EMPTY_BALANCE_SHEET: BalanceSheet = {
  assets: [],
  liabilities: [],
  totalAssets: 0,
  totalLiabilities: 0,
};

function isSameMonth(dateIso: string, reference: Date): boolean {
  const date = new Date(dateIso);
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

/**
 * The month Home/Analytics should summarize: the real current month if any transaction falls in
 * it, otherwise the most recent month that has data. Without this, a device whose transactions are
 * all dated earlier (old receipts scanned today, or a manually-entered date) would compute a
 * correctly-zero-but-useless "this month" summary forever, even though real data exists.
 */
export function resolveSummaryMonth(transactions: Transaction[], now: Date = new Date()): Date {
  if (transactions.length === 0 || transactions.some((transaction) => isSameMonth(transaction.date, now))) {
    return now;
  }

  return transactions.reduce((mostRecent, transaction) => {
    const date = new Date(transaction.date);
    return date.getTime() > mostRecent.getTime() ? date : mostRecent;
  }, new Date(0));
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other';
}

/** This calendar month's income/expense totals from the live transaction list — Home's Net summary card. */
export function computeMonthlySummary(transactions: Transaction[], now: Date = new Date()): MonthlySummary {
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let income = 0;
  let expenses = 0;
  let previousMonthExpenses = 0;

  for (const transaction of transactions) {
    if (isSameMonth(transaction.date, now)) {
      if (transaction.amount >= 0) {
        income += transaction.amount;
      } else {
        expenses += Math.abs(transaction.amount);
      }
    } else if (transaction.amount < 0 && isSameMonth(transaction.date, previousMonth)) {
      previousMonthExpenses += Math.abs(transaction.amount);
    }
  }

  return { month: monthLabel(now), income, expenses, previousMonthExpenses };
}

/** This month's expenses grouped by category, largest first — SpendingChart's pie breakdown. */
export function computeSpendingCategories(transactions: Transaction[], now: Date = new Date()): SpendingCategory[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.amount < 0 && isSameMonth(transaction.date, now)) {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + Math.abs(transaction.amount));
    }
  }

  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([label, amount], index) => ({
      id: slugify(label),
      label,
      amount,
      color: chartPalette[index % chartPalette.length],
    }));
}

/** This month's income grouped by source (the transaction's merchant/source field) — CashFlowChart's bars. */
export function computeCashFlowSummary(transactions: Transaction[], now: Date = new Date()): CashFlowSummary {
  const sourceTotals = new Map<string, number>();
  let totalOutflow = 0;

  for (const transaction of transactions) {
    if (!isSameMonth(transaction.date, now)) {
      continue;
    }
    if (transaction.amount >= 0) {
      sourceTotals.set(transaction.merchant, (sourceTotals.get(transaction.merchant) ?? 0) + transaction.amount);
    } else {
      totalOutflow += Math.abs(transaction.amount);
    }
  }

  const incomeSources = Array.from(sourceTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([label, amount]) => ({ id: slugify(label), label, amount }));

  const totalIncome = incomeSources.reduce((sum, source) => sum + source.amount, 0);

  return { month: monthLabel(now), incomeSources, totalIncome, totalOutflow };
}
