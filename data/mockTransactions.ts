import { PeriodSummary, SummaryPeriod } from '@/types/transaction';

export const mockPeriodSummaries: Record<SummaryPeriod, PeriodSummary> = {
  week: {
    period: 'week',
    label: 'Aug 16 – 22',
    income: 800,
    expenses: 62.4,
    previousExpenses: 74.1,
    hasComparison: true,
  },
  month: {
    period: 'month',
    label: 'August 2026',
    income: 3200,
    expenses: 244.93,
    previousExpenses: 279.6,
    hasComparison: true,
  },
  year: {
    period: 'year',
    label: '2026',
    income: 24800,
    expenses: 3120.45,
    previousExpenses: 3450.1,
    hasComparison: true,
  },
  all: {
    period: 'all',
    label: 'All Time',
    income: 58200,
    expenses: 8760.32,
    previousExpenses: 0,
    hasComparison: false,
  },
};
