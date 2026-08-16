import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Transaction } from '@/types/transaction';

const CSV_HEADERS = ['Vendor', 'Amount', 'Category', 'Date', 'IsDeductible'];

function escapeCsvField(value: string): string {
  // Quote (and double up any embedded quotes) whenever the field itself
  // could otherwise be misread as a delimiter or row break.
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

function transactionToCsvRow(transaction: Transaction): string {
  return toCsvRow([
    transaction.merchant,
    transaction.amount.toFixed(2),
    transaction.category,
    transaction.date.slice(0, 10), // YYYY-MM-DD — unambiguous for spreadsheet import
    // Spelled out rather than TRUE/FALSE — this file is read by a human accountant, not just parsed.
    transaction.isDeductible ? 'Yes' : 'No',
  ]);
}

export function buildTransactionsCsv(transactions: Transaction[]): string {
  const rows = [toCsvRow(CSV_HEADERS), ...transactions.map(transactionToCsvRow)];
  return rows.join('\n');
}

/**
 * Writes the given transactions to a CSV file in the app's document
 * directory and opens the native share sheet (email, Drive, AirDrop, etc.)
 * so the user can hand it off. Resolves once the share sheet is dismissed —
 * note that resolves the same way whether the user actually shared it
 * somewhere or just cancelled, since the OS doesn't distinguish the two.
 *
 * Throws if the device can't present a share sheet at all (e.g. web).
 */
export async function generateAndShareCSV(transactions: Transaction[], fileName = 'Tax_Export.csv'): Promise<void> {
  const csv = buildTransactionsCsv(transactions);

  const file = new File(Paths.document, fileName);
  file.create({ overwrite: true });
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing isn't available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export transactions',
  });
}
