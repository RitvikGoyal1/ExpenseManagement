import { chartPalette } from '@/constants/theme';
import { BalanceSheet, CashFlowSummary, SpendingCategory } from '@/types/analytics';
import { PeriodSummary, SummaryPeriod, Transaction } from '@/types/transaction';

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

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** Inclusive start / exclusive end of the bucket `period` falls into around `reference`. */
function periodBounds(period: SummaryPeriod, reference: Date): { start: Date; end: Date } {
  switch (period) {
    case 'week': {
      const start = startOfWeek(reference);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case 'month':
      return {
        start: new Date(reference.getFullYear(), reference.getMonth(), 1),
        end: new Date(reference.getFullYear(), reference.getMonth() + 1, 1),
      };
    case 'year':
      return {
        start: new Date(reference.getFullYear(), 0, 1),
        end: new Date(reference.getFullYear() + 1, 0, 1),
      };
    case 'all':
      // No real bucketing — every transaction counts as "within" All Time.
      return { start: new Date(0), end: new Date(8640000000000000) };
  }
}

function isWithinPeriod(dateIso: string, period: SummaryPeriod, reference: Date): boolean {
  const { start, end } = periodBounds(period, reference);
  const time = new Date(dateIso).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function isSameMonth(dateIso: string, reference: Date): boolean {
  return isWithinPeriod(dateIso, 'month', reference);
}

/** The bucket immediately before the one `reference` falls into — used for the trend comparison. */
function previousPeriodReference(period: SummaryPeriod, reference: Date): Date {
  switch (period) {
    case 'week':
      return new Date(reference.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    case 'year':
      return new Date(reference.getFullYear() - 1, 0, 1);
    case 'all':
      return reference;
  }
}

/**
 * The bucket Home's period selector should summarize: the real current bucket if any transaction
 * falls in it, otherwise the bucket containing the most recent transaction. Without this, a device
 * whose transactions are all dated earlier (old receipts scanned today, or a manually-entered date)
 * would compute a correctly-zero-but-useless "this week/month/year" summary forever, even though
 * real data exists. 'all' has only one bucket, so it never needs a fallback.
 */
export function resolveSummaryReference(transactions: Transaction[], period: SummaryPeriod, now: Date = new Date()): Date {
  if (
    period === 'all' ||
    transactions.length === 0 ||
    transactions.some((transaction) => isWithinPeriod(transaction.date, period, now))
  ) {
    return now;
  }

  return transactions.reduce((mostRecent, transaction) => {
    const date = new Date(transaction.date);
    return date.getTime() > mostRecent.getTime() ? date : mostRecent;
  }, new Date(0));
}

/** Analytics' month-only fallback — see resolveSummaryReference, which this now delegates to. */
export function resolveSummaryMonth(transactions: Transaction[], now: Date = new Date()): Date {
  return resolveSummaryReference(transactions, 'month', now);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function weekLabel(reference: Date): string {
  const { start } = periodBounds('week', reference);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${format(start)} – ${format(end)}`;
}

function periodLabel(period: SummaryPeriod, reference: Date): string {
  switch (period) {
    case 'week':
      return weekLabel(reference);
    case 'month':
      return monthLabel(reference);
    case 'year':
      return `${reference.getFullYear()}`;
    case 'all':
      return 'All Time';
  }
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other';
}

/** Income/expense totals for `period`, plus the prior period's expenses for the trend badge — Home's Net summary card. */
export function computeSummary(transactions: Transaction[], period: SummaryPeriod, now: Date = new Date()): PeriodSummary {
  const hasComparison = period !== 'all';
  const previousReference = hasComparison ? previousPeriodReference(period, now) : now;

  let income = 0;
  let expenses = 0;
  let previousExpenses = 0;

  for (const transaction of transactions) {
    if (isWithinPeriod(transaction.date, period, now)) {
      if (transaction.amount >= 0) {
        income += transaction.amount;
      } else {
        expenses += Math.abs(transaction.amount);
      }
    } else if (hasComparison && transaction.amount < 0 && isWithinPeriod(transaction.date, period, previousReference)) {
      previousExpenses += Math.abs(transaction.amount);
    }
  }

  return { period, label: periodLabel(period, now), income, expenses, previousExpenses, hasComparison };
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
