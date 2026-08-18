import { NetWorthItem, NetWorthItemType } from '@/types/analytics';
import { LineItem, Transaction, TRANSACTION_CATEGORIES, TransactionCategory } from '@/types/transaction';
import { supabase } from '@/utils/supabase';

const TRANSACTIONS_TABLE = 'transactions';
const NET_WORTH_TABLE = 'net_worth_items';

// Deployed schema (Supabase SQL editor) — RLS requires user_id to match auth.uid(), and there is
// no deduction_category column, so that field stays local-only (see the comment on TransactionInput
// below) rather than round-tripping to Supabase:
//
//   CREATE TABLE transactions (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//     vendor_name TEXT,
//     total_amount NUMERIC,
//     transaction_date DATE,
//     category TEXT,
//     is_tax_deductible BOOLEAN,
//     image_url TEXT,
//     line_items JSONB,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
//   );
//
// `line_items` is new as of Phase 14 — run this once against an existing database before this
// code ships, or every insert/select touching it will fail:
//   ALTER TABLE transactions ADD COLUMN IF NOT EXISTS line_items JSONB;

/** The structured fields ReceiptConfirmationModal/ManualTransactionModal collect — everything but the receipt image itself. */
export interface TransactionInput {
  merchant: string;
  amount: number;
  date: string;
  category: TransactionCategory;
  isDeductible: boolean;
  /** Items Gemini read off the receipt — omitted (or empty) for a manual entry or an unreadable receipt. */
  lineItems?: LineItem[];
}

interface TransactionRow {
  id: string;
  vendor_name: string | null;
  /** PostgREST serializes `numeric` columns as JSON strings (to avoid float precision loss), not numbers. */
  total_amount: string | number | null;
  transaction_date: string | null;
  category: string | null;
  is_tax_deductible: boolean | null;
  image_url: string | null;
  line_items: LineItem[] | null;
}

function isTransactionCategory(value: string | null): value is TransactionCategory {
  return value !== null && (TRANSACTION_CATEGORIES as string[]).includes(value);
}

/**
 * Inserts a confirmed transaction into the "transactions" table under the current anonymous (or,
 * later, real) user, optionally pointing it at an already-uploaded receipt image. Returns the
 * server-generated row id — callers must use this (not a client-generated id) as the local Zustand
 * transaction's id, since deleteTransaction below targets rows by that same `uuid` column.
 *
 * `imagePath` is `null` for a manual entry (ManualTransactionModal — no photo involved) and the
 * storage object path for a scanned receipt (ReceiptConfirmationModal, after uploadReceiptImage
 * resolves). Throws on failure — including when there's no active Supabase session, since the
 * table's `user_id` column is `NOT NULL` and RLS would reject the row anyway. For the scan flow,
 * callers should only reach this after uploadReceiptImage has resolved, so a transaction row never
 * gets created for a receipt image that didn't actually make it to storage.
 */
export async function insertTransaction(transactionData: TransactionInput, imagePath: string | null): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated Supabase user — cannot insert a transaction.');
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert({
      user_id: user.id,
      vendor_name: transactionData.merchant,
      total_amount: transactionData.amount,
      transaction_date: transactionData.date,
      category: transactionData.category,
      is_tax_deductible: transactionData.isDeductible,
      image_url: imagePath,
      line_items: transactionData.lineItems && transactionData.lineItems.length > 0 ? transactionData.lineItems : null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

/**
 * Fetches every transaction belonging to the current Supabase user, newest first. The Zustand
 * transaction store only ever lives in memory — nothing persists it to disk — so this is what
 * rehydrates it on app boot; without it, every cold start shows an empty list regardless of what's
 * actually sitting in the "transactions" table. `deductionCategory` never comes back set, since
 * (per TransactionInput above) that field was never sent to Supabase in the first place.
 *
 * Throws on failure — including when there's no active session — matching insertTransaction, since
 * RootLayout calls this right after initializeAnonymousSession and treats a failure here the same
 * way: log it, leave the local list empty, don't crash the boot sequence over it.
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated Supabase user — cannot fetch transactions.');
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('id, vendor_name, total_amount, transaction_date, category, is_tax_deductible, image_url, line_items')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<TransactionRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    merchant: row.vendor_name ?? 'Unknown Merchant',
    amount: Number(row.total_amount ?? 0),
    date: row.transaction_date ?? new Date().toISOString(),
    category: isTransactionCategory(row.category) ? row.category : 'Other',
    isDeductible: row.is_tax_deductible ?? false,
    imagePath: row.image_url ?? undefined,
    lineItems: row.line_items && row.line_items.length > 0 ? row.line_items : undefined,
  }));
}

/**
 * Deletes a single transaction row (swipe-to-delete). RLS scopes every query to rows the caller's
 * `auth.uid()` owns, so there's no need to filter by user_id here too — a foreign or already-gone
 * id just deletes zero rows rather than reaching someone else's. Throws on failure so the
 * optimistic local removal in useTransactionStore can be rolled back.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from(TRANSACTIONS_TABLE).delete().eq('id', id);
  if (error) {
    throw error;
  }
}

// Deployed schema (Supabase SQL editor) — same RLS shape as `transactions` above (user_id must
// match auth.uid()), created for the Settings "Net Worth" section since account-balance data
// didn't exist anywhere in this app before:
//
//   CREATE TABLE net_worth_items (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//     label TEXT NOT NULL,
//     amount NUMERIC NOT NULL,
//     item_type TEXT NOT NULL CHECK (item_type IN ('asset', 'liability')),
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
//   );
//
//   ALTER TABLE net_worth_items ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Users manage their own net worth items" ON net_worth_items
//     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

/** The fields NetWorthItemModal collects for one asset/liability line. */
export interface NetWorthItemInput {
  label: string;
  amount: number;
  type: NetWorthItemType;
}

interface NetWorthItemRow {
  id: string;
  label: string;
  /** PostgREST serializes `numeric` columns as JSON strings (to avoid float precision loss), not numbers. */
  amount: string | number;
  item_type: string;
}

function isNetWorthItemType(value: string): value is NetWorthItemType {
  return value === 'asset' || value === 'liability';
}

/**
 * Inserts a net worth line item under the current anonymous (or, later, real) user and returns the
 * server-generated row id — needed because deleteNetWorthItem below has to target that exact row,
 * and there's no other client-side id to fall back on.
 */
export async function insertNetWorthItem(item: NetWorthItemInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated Supabase user — cannot insert a net worth item.');
  }

  const { data, error } = await supabase
    .from(NET_WORTH_TABLE)
    .insert({
      user_id: user.id,
      label: item.label,
      amount: item.amount,
      item_type: item.type,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

/**
 * Fetches every net worth item belonging to the current Supabase user, newest first. Like the
 * transaction store, useNetWorthStore only ever lives in memory, so this is what rehydrates it on
 * app boot.
 */
export async function fetchNetWorthItems(): Promise<NetWorthItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated Supabase user — cannot fetch net worth items.');
  }

  const { data, error } = await supabase
    .from(NET_WORTH_TABLE)
    .select('id, label, amount, item_type')
    .order('created_at', { ascending: false })
    .returns<NetWorthItemRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((row) => isNetWorthItemType(row.item_type))
    .map((row) => ({
      id: row.id,
      label: row.label,
      amount: Number(row.amount ?? 0),
      type: row.item_type as NetWorthItemType,
    }));
}

/**
 * Deletes a single net worth item row. RLS scopes every query to rows the caller's `auth.uid()`
 * owns, so there's no need to filter by user_id here too.
 */
export async function deleteNetWorthItem(id: string): Promise<void> {
  const { error } = await supabase.from(NET_WORTH_TABLE).delete().eq('id', id);
  if (error) {
    throw error;
  }
}
