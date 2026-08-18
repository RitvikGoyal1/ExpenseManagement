import { useEffect, useMemo, useState } from 'react';

import { Transaction } from '@/types/transaction';

export type DatePreset = 'all' | '7d' | 'month' | 'year' | 'custom';

export interface DateRangeValue {
  preset: DatePreset;
  /** ISO date strings — only meaningful (and non-null) when preset is 'custom'. */
  start: string | null;
  end: string | null;
}

export const DEFAULT_DATE_RANGE: DateRangeValue = { preset: 'all', start: null, end: null };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PRICE_CEILING_STEP = 50;
const MIN_PRICE_CEILING = 50;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function resolveDateBounds(range: DateRangeValue): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range.preset) {
    case '7d':
      return { start: startOfDay(new Date(now.getTime() - 6 * ONE_DAY_MS)), end: endOfDay(now) };
    case 'month':
      return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
    case 'year':
      return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now) };
    case 'custom':
      return {
        start: range.start ? startOfDay(new Date(range.start)) : null,
        end: range.end ? endOfDay(new Date(range.end)) : null,
      };
    case 'all':
    default:
      return { start: null, end: null };
  }
}

function matchesQuery(transaction: Transaction, needle: string): boolean {
  if (transaction.merchant.toLowerCase().includes(needle)) {
    return true;
  }
  return (transaction.lineItems ?? []).some((item) => item.description.toLowerCase().includes(needle));
}

export interface UseTransactionFiltersResult {
  query: string;
  setQuery: (query: string) => void;
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  /** Data-derived upper bound for the price slider — rounds up so there's always usable headroom. */
  priceCeiling: number;
  /** Bump whenever priceRange is reset programmatically (data load, "Clear Filters") — Slider's own
   *  `value` prop is write-once, so PriceRangeSlider keys its thumbs on this to force a visual reset. */
  priceResetKey: number;
  filtered: Transaction[];
  activeFilterCount: number;
  resetFilters: () => void;
}

/**
 * Combines free-text search (vendor or any line-item description), an amount range, and a date
 * range into a single filtered transaction list — all three narrow the same set, so "Coffee between
 * $5 and $20 this month" is just every condition ANDed together.
 */
export function useTransactionFilters(transactions: Transaction[]): UseTransactionFiltersResult {
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const [hasAdjustedPrice, setHasAdjustedPrice] = useState(false);
  const [priceResetKey, setPriceResetKey] = useState(0);

  const priceCeiling = useMemo(() => {
    const magnitudes = transactions.map((transaction) => Math.abs(transaction.amount));
    const dataMax = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;
    return Math.max(MIN_PRICE_CEILING, Math.ceil((dataMax || 1) / PRICE_CEILING_STEP) * PRICE_CEILING_STEP);
  }, [transactions]);

  const [priceRange, setPriceRangeState] = useState<[number, number]>([0, priceCeiling]);

  // Transactions finish loading from Supabase asynchronously, after this screen has already
  // mounted with an empty list — this keeps the slider's ceiling tracking the real data instead of
  // opening pinned to the [0, 50] floor, but only until the user actually touches a thumb; once
  // they've picked their own range, their choice is never silently overwritten by a data refresh.
  useEffect(() => {
    if (!hasAdjustedPrice) {
      setPriceRangeState([0, priceCeiling]);
      setPriceResetKey((key) => key + 1);
    }
  }, [priceCeiling, hasAdjustedPrice]);

  const setPriceRange = (range: [number, number]) => {
    setHasAdjustedPrice(true);
    setPriceRangeState(range);
  };

  const dateBounds = useMemo(() => resolveDateBounds(dateRange), [dateRange]);
  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (trimmedQuery && !matchesQuery(transaction, trimmedQuery)) {
        return false;
      }
      const magnitude = Math.abs(transaction.amount);
      if (magnitude < priceRange[0] || magnitude > priceRange[1]) {
        return false;
      }
      if (dateBounds.start || dateBounds.end) {
        const transactionDate = new Date(transaction.date);
        if (dateBounds.start && transactionDate < dateBounds.start) {
          return false;
        }
        if (dateBounds.end && transactionDate > dateBounds.end) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, trimmedQuery, priceRange, dateBounds]);

  const isPriceFilterActive = hasAdjustedPrice && (priceRange[0] > 0 || priceRange[1] < priceCeiling);
  const isDateFilterActive = dateRange.preset !== 'all';
  const activeFilterCount = [trimmedQuery.length > 0, isPriceFilterActive, isDateFilterActive].filter(Boolean).length;

  const resetFilters = () => {
    setQuery('');
    setDateRange(DEFAULT_DATE_RANGE);
    setHasAdjustedPrice(false); // the effect above snaps priceRange (and the slider thumbs) back to full range
  };

  return {
    query,
    setQuery,
    dateRange,
    setDateRange,
    priceRange,
    setPriceRange,
    priceCeiling,
    priceResetKey,
    filtered,
    activeFilterCount,
    resetFilters,
  };
}
