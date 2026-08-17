export interface SpendingCategory {
  id: string;
  label: string;
  amount: number;
  color: string;
}

export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
}

export interface CashFlowSummary {
  month: string;
  incomeSources: IncomeSource[];
  totalIncome: number;
  totalOutflow: number;
}

export interface BalanceSheetItem {
  id: string;
  label: string;
  amount: number;
}

export interface BalanceSheet {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  totalAssets: number;
  totalLiabilities: number;
}

export interface QuickPrompt {
  id: string;
  question: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}
