import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';

import { BalanceSheet, CashFlowSummary, ChatMessage, SpendingCategory } from '@/types/analytics';

// Expo inlines EXPO_PUBLIC_-prefixed vars into the client bundle at build time — set this in
// a .env file (EXPO_PUBLIC_GEMINI_API_KEY=...) rather than committing a real key here.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// Same pinned model the receipt scanner uses (services/ocrService.ts) — one tested, working
// model id for the app rather than a second alias to track and risk having retired out from
// under us.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// 503 ("model overloaded") and 429 ("rate limited") are transient — a couple of short-backoff
// retries clears most of them, same reasoning as the OCR pipeline's retry loop.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Hard wall-clock budget for the whole exchange (all retries included), so a demand spike makes
// the request fail fast into the sheet's own error bubble instead of leaving "AI is thinking…"
// spinning indefinitely.
const GEMINI_TIMEOUT_MS = 10_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  return error instanceof GoogleGenerativeAIFetchError && error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status);
}

/** Races `task` against a deadline; aborts `controller` and rejects if the deadline wins. */
function withTimeout<T>(task: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini chat request timed out after ${ms}ms`));
    }, ms);

    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface FinancialContext {
  spendingCategories: SpendingCategory[];
  cashFlow: CashFlowSummary;
  balanceSheet: BalanceSheet;
}

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/** Renders the analytics screen's current numbers into plain text Gemini can ground answers in. */
function buildSystemInstruction({ spendingCategories, cashFlow, balanceSheet }: FinancialContext): string {
  const netWorth = balanceSheet.totalAssets - balanceSheet.totalLiabilities;
  const netCashFlow = cashFlow.totalIncome - cashFlow.totalOutflow;

  const spendingLines = spendingCategories.map((category) => `- ${category.label}: ${formatCurrency(category.amount)}`).join('\n');
  const incomeLines = cashFlow.incomeSources.map((source) => `- ${source.label}: ${formatCurrency(source.amount)}`).join('\n');
  const assetLines = balanceSheet.assets.map((asset) => `- ${asset.label}: ${formatCurrency(asset.amount)}`).join('\n');
  const liabilityLines = balanceSheet.liabilities.map((liability) => `- ${liability.label}: ${formatCurrency(liability.amount)}`).join('\n');

  return [
    "You are the AI assistant built into a personal finance and tax app. Answer the user's question about their own finances using ONLY the data below — never invent a number that isn't derivable from it.",
    '',
    `Spending by category, ${cashFlow.month}:`,
    spendingLines,
    '',
    'Income sources:',
    incomeLines,
    `Total income: ${formatCurrency(cashFlow.totalIncome)}`,
    `Total outflow: ${formatCurrency(cashFlow.totalOutflow)}`,
    `Net cash flow: ${formatCurrency(netCashFlow)}`,
    '',
    'Assets:',
    assetLines,
    'Liabilities:',
    liabilityLines,
    `Net worth: ${formatCurrency(netWorth)}`,
    '',
    'Reply in 1-3 short sentences, specific with numbers, like a sharp advisor texting a client back. Plain prose only — no markdown, no bullet lists, no headers.',
  ].join('\n');
}

function getChatModel(context: FinancialContext) {
  if (!GEMINI_API_KEY) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not configured.');
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemInstruction(context),
  });
}

function toGeminiHistory(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: message.text }],
  }));
}

/**
 * Sends the user's question — plus prior turns, for continuity — to Gemini, grounded in the
 * analytics screen's current financial snapshot via a system instruction.
 *
 * Throws on any failure (missing API key, network error, or retries exhausted on a transient
 * 429/503) rather than returning a fallback string, so the caller can render its own error bubble
 * in the chat thread instead of silently passing along a wrong-looking reply.
 */
export async function getFinancialChatReply(question: string, priorMessages: ChatMessage[], context: FinancialContext): Promise<string> {
  const controller = new AbortController();
  const model = getChatModel(context);
  const chat = model.startChat({ history: toGeminiHistory(priorMessages) });

  const attempts = async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await chat.sendMessage(question, { signal: controller.signal });
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS || !isRetryableError(error)) {
          throw error;
        }
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  };

  const result = await withTimeout(attempts(), GEMINI_TIMEOUT_MS, controller);
  const text = result.response.text().trim();
  if (!text) {
    throw new Error('Gemini returned an empty reply.');
  }
  return text;
}
