import { chartPalette } from '@/constants/theme';
import { BalanceSheet, CashFlowSummary, QuickPrompt, SpendingCategory } from '@/types/analytics';

export const mockSpendingCategories: SpendingCategory[] = [
  { id: 'housing', label: 'Housing', amount: 2200, color: chartPalette[0] },
  { id: 'food', label: 'Food', amount: 850, color: chartPalette[1] },
  { id: 'transportation', label: 'Transportation', amount: 450, color: chartPalette[2] },
  { id: 'entertainment', label: 'Entertainment', amount: 400, color: chartPalette[3] },
  { id: 'utilities', label: 'Utilities', amount: 320, color: chartPalette[4] },
];

export const mockCashFlow: CashFlowSummary = {
  month: 'August 2026',
  incomeSources: [
    { id: 'salary', label: 'Salary', amount: 5800 },
    { id: 'freelance', label: 'Freelance', amount: 950 },
    { id: 'dividends', label: 'Dividends', amount: 300 },
  ],
  totalIncome: 7050,
  totalOutflow: 4220,
};

export const mockBalanceSheet: BalanceSheet = {
  assets: [
    { id: 'cash', label: 'Cash', amount: 45000 },
    { id: 'investments', label: 'Investments', amount: 132000 },
    { id: 'real-estate', label: 'Real Estate', amount: 250000 },
  ],
  liabilities: [
    { id: 'mortgage', label: 'Mortgage', amount: 245000 },
    { id: 'loans', label: 'Loans', amount: 38500 },
    { id: 'credit-cards', label: 'Credit Cards', amount: 16000 },
  ],
  totalAssets: 427000,
  totalLiabilities: 299500,
};

export const mockQuickPrompts: QuickPrompt[] = [
  {
    id: 'savings-rate',
    question: 'What is my savings rate?',
    insight:
      "Your savings rate is ~40% this month — you kept $2,830 of the $7,050 you earned. That's well above the 20% benchmark most planners recommend.",
  },
  {
    id: 'food-spending',
    question: 'Analyze my food spending',
    insight:
      'Food spending is $850 this month, about 20% of total expenses. It ranks second behind Housing, which alone accounts for 52% of total expenses.',
  },
  {
    id: 'net-worth',
    question: 'Net worth summary',
    insight:
      'Your net worth is $127,500 — $427,000 in assets against $299,500 in liabilities, for an asset-to-debt ratio of roughly 1.4x.',
  },
  {
    id: 'cut-back',
    question: 'Where can I cut back?',
    insight:
      'Entertainment ($400) and Utilities ($320) together make up 17% of spending. Trimming discretionary entertainment by half would add about $200/month back to savings.',
  },
];
