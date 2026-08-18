import { File } from 'expo-file-system';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError, ObjectSchema, SchemaType } from '@google/generative-ai';
import { Platform } from 'react-native';

import { LineItem, TRANSACTION_CATEGORIES, TransactionCategory } from '@/types/transaction';

// Expo inlines EXPO_PUBLIC_-prefixed vars into the client bundle at build time — set this in
// a .env file (EXPO_PUBLIC_GEMINI_API_KEY=...) rather than committing a real key here.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// Gated behind __DEV__ so this can never mock a production build even if left `true` — flip the
// second operand back to `true` if the free-tier quota gets exhausted again during testing.
const USE_MOCK_OCR = __DEV__ && false;
const MOCK_OCR_DELAY_MS = 2000;

// TransactionCategory has no "Housing" bucket — "Shopping" is the closest real fit for a Home
// Depot receipt and keeps this type-correct against the schema the rest of the app expects.
const MOCK_RECEIPT_RESULT: ParsedReceiptData = {
  merchant: 'Home Depot',
  amount: 142.5,
  date: new Date().toISOString(),
  category: 'Shopping',
  isTaxDeductible: true,
  lineItems: [
    { description: '2x4 Lumber (8ft, 6-pack)', price: 24.97 },
    { description: 'Wood Screws (1lb box)', price: 8.99 },
    { description: 'Paint Roller Kit', price: 14.54 },
    { description: 'Interior Latex Paint (1gal)', price: 34.98 },
  ],
};

// Pinned to a specific version rather than a "-latest" alias: aliases get hot-swapped by Google
// and silently break (this replaced gemini-2.0-flash after it was retired from the API).
// Switched from gemini-3.7-flash to the Flash-Lite tier after the Phase 10 free-tier rate limit —
// Flash-Lite trades a bit of accuracy for a much higher free-tier request quota, which is the
// actual bottleneck receipt scanning was hitting, not model quality.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const RECEIPT_PROMPT =
  'Analyze this receipt. Extract the vendor name, total amount, and date. Categorize the spending ' +
  'into exactly one of the provided categories, and determine if it is likely a business tax deduction. ' +
  "Also read every individual line item on the receipt — don't stop at the total. For each distinct " +
  'product or service purchased, list its own short description and its own price, even if the receipt ' +
  'has many items. Skip subtotal/tax/total lines themselves (those are not items). If no individual ' +
  'items are legible, return an empty items array rather than guessing.';

// Enforced via `format: 'enum'` below so Gemini can only return a value that already fits our
// TransactionCategory union — no free-text category to validate or translate on the way back.
const receiptSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    vendorName: {
      type: SchemaType.STRING,
      description: 'The name of the store or merchant that issued the receipt.',
    },
    totalAmount: {
      type: SchemaType.NUMBER,
      description: 'The final total amount charged, as a positive number.',
    },
    transactionDate: {
      type: SchemaType.STRING,
      description: 'The date printed on the receipt, formatted as an ISO 8601 date (YYYY-MM-DD).',
    },
    category: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: TRANSACTION_CATEGORIES,
      description: 'The spending category that best matches this purchase.',
    },
    isTaxDeductible: {
      type: SchemaType.BOOLEAN,
      description: 'Whether this purchase is plausibly a deductible business expense.',
    },
    items: {
      type: SchemaType.ARRAY,
      description:
        'Every individual product or service line item on the receipt (not subtotal/tax/total lines). ' +
        'Empty array if no items are legible.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: {
            type: SchemaType.STRING,
            description: 'A short description of the purchased item as printed on the receipt.',
          },
          price: {
            type: SchemaType.NUMBER,
            description: "This item's own price, as a positive number.",
          },
        },
        required: ['description', 'price'],
      },
    },
  },
  required: ['vendorName', 'totalAmount', 'transactionDate', 'category', 'isTaxDeductible', 'items'],
};

interface GeminiLineItem {
  description: string;
  price: number;
}

interface GeminiReceiptResult {
  vendorName: string;
  totalAmount: number;
  transactionDate: string;
  category: string;
  isTaxDeductible: boolean;
  items: GeminiLineItem[];
}

export interface ParsedReceiptData {
  merchant: string;
  /** Positive magnitude — sign convention is the caller's concern, not parsing's. */
  amount: number;
  /** ISO 8601 date string. */
  date: string;
  category: TransactionCategory;
  isTaxDeductible: boolean;
  /** Always an array (possibly empty) — the OCR.space fallback has no item-extraction capability at all. */
  lineItems: LineItem[];
}

function getModel() {
  if (!GEMINI_API_KEY) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not configured.');
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: receiptSchema,
    },
  });
}

function isTransactionCategory(value: string): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as string[]).includes(value);
}

/** Falls back to today when Gemini's date is missing or unparseable rather than surfacing a Date "Invalid Date". */
function normalizeDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

// 503 ("model overloaded") and 429 ("rate limited") are transient by nature — Gemini's own error
// message for the former literally says "please try again later" — so a couple of short-backoff
// retries clears most of them without the receipt ever falling through to the blank-form fallback.
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  return error instanceof GoogleGenerativeAIFetchError && error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hard wall-clock budget for the whole Gemini step (all retries included). A demand spike can
// make Gemini hang rather than fail fast, and a slow "primary" provider is worse than no primary
// provider — past this, abort and let the OCR.space fallback take over instead of making the user
// wait on a request that may never come back.
const GEMINI_TIMEOUT_MS = 10_000;

/** Races `task` against a deadline; aborts `controller` and rejects if the deadline wins. */
function withTimeout<T>(task: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini request timed out after ${ms}ms`));
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

function mapLineItems(items: GeminiLineItem[] | undefined): LineItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter((item) => item && typeof item.description === 'string' && item.description.trim() && Number.isFinite(item.price))
    .map((item) => ({ description: item.description.trim(), price: Math.abs(item.price) }));
}

function mapGeminiResult(result: GeminiReceiptResult): ParsedReceiptData {
  return {
    merchant: result.vendorName?.trim() || 'Unknown Merchant',
    amount: Number.isFinite(result.totalAmount) ? Math.abs(result.totalAmount) : 0,
    date: normalizeDate(result.transactionDate),
    category: isTransactionCategory(result.category) ? result.category : 'Other',
    isTaxDeductible: Boolean(result.isTaxDeductible),
    lineItems: mapLineItems(result.items),
  };
}

// expo-file-system's `File` throws "not supported on web" — on web, the camera/picker hand back a
// `blob:` URL instead of a native file path, so the image has to be fetched through the browser's
// own `fetch`/`Blob` APIs instead. Both the Gemini (base64) and OCR.space (multipart) call sites
// need the raw bytes, so this is the one place that knows how to get them on either platform.
function fetchImageBlob(imageUri: string): Promise<Blob> {
  return fetch(imageUri).then((response) => response.blob());
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image blob.'));
    reader.onloadend = () => {
      // readAsDataURL yields "data:image/jpeg;base64,AAAA..." — Gemini wants just the payload.
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function readImageAsBase64(imageUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return blobToBase64(await fetchImageBlob(imageUri));
  }
  const file = new File(imageUri);
  return file.base64();
}

/**
 * Reads the captured receipt off disk, sends it to Gemini for structured extraction, and maps the
 * response into the shape ReceiptConfirmationModal expects.
 *
 * Never throws — any failure (missing API key, network error, malformed response, or blowing the
 * `GEMINI_TIMEOUT_MS` budget) is caught and reported as `null` so callers can fall back. Transient
 * overload/rate-limit responses are retried within that same budget before giving up.
 */
export async function processReceiptWithGemini(imageUri: string): Promise<ParsedReceiptData | null> {
  if (USE_MOCK_OCR) {
    console.log(`[OCR] USE_MOCK_OCR is on — skipping the Gemini fetch and returning the canned "${MOCK_RECEIPT_RESULT.merchant}" receipt in ${MOCK_OCR_DELAY_MS}ms.`);
    await delay(MOCK_OCR_DELAY_MS);
    return MOCK_RECEIPT_RESULT;
  }

  const controller = new AbortController();

  try {
    const model = getModel();

    console.log(`[OCR] Fetching receipt image from disk: ${imageUri}`);
    const base64Data = await readImageAsBase64(imageUri);

    const attempts = async () => {
      let response;
      for (let attempt = 1; ; attempt++) {
        console.log(`[OCR] Sending receipt to Gemini model "${GEMINI_MODEL}" (attempt ${attempt}/${MAX_ATTEMPTS})…`);
        try {
          response = await model.generateContent(
            [RECEIPT_PROMPT, { inlineData: { mimeType: 'image/jpeg', data: base64Data } }],
            { signal: controller.signal },
          );
          break;
        } catch (error) {
          if (attempt >= MAX_ATTEMPTS || !isRetryableError(error)) {
            throw error;
          }
          console.log(`[OCR] Gemini attempt ${attempt} failed with a retryable error, backing off before retry…`, error);
          await delay(RETRY_DELAY_MS * attempt);
        }
      }
      return response;
    };

    const response = await withTimeout(attempts(), GEMINI_TIMEOUT_MS, controller);

    const text = response.response.text();
    const parsed: GeminiReceiptResult = JSON.parse(text);
    console.log(`[OCR] Gemini ("${GEMINI_MODEL}") returned:`, parsed);

    return mapGeminiResult(parsed);
  } catch (error) {
    console.warn(`[OCR] Gemini ("${GEMINI_MODEL}") receipt extraction failed:`, error);
    return null;
  }
}

// --- OCR.space + regex fallback -------------------------------------------------------------
// Gemini is the primary path, but demand-spike 503s can outlast its own retry budget. Rather than
// let the user hit a blank form every time that happens, a second, independent provider backs it
// up. This is the same OCR.space + regex pipeline Phase 9 shipped with — cruder (no category or
// tax-deductibility guess), but a second real vendor/amount/date reading beats none.

// Free-tier OCR via api.ocr.space. The "helloworld" key is their public testing key — shared,
// rate-limited (500 req/day per IP), and capped at 1MB per image. Swap for a real key before
// leaning on this path in production.
const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'helloworld';

interface OcrSpaceParsedResult {
  ParsedText: string;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  OCRExitCode?: number;
}

/** Uploads the receipt to OCR.space and returns the raw recognized text block. Throws on any failure. */
async function extractTextFromImage(imageUri: string): Promise<string> {
  console.log(`[OCR] Fetching receipt text from OCR.space (engine 2): ${imageUri}`);
  const formData = new FormData();
  if (Platform.OS === 'web') {
    // The browser's real FormData needs an actual Blob — the {uri, name, type} shape below just
    // gets stringified to "[object Object]" on web, which is what was producing OCR.space's 400s.
    formData.append('file', await fetchImageBlob(imageUri), 'receipt.jpg');
  } else {
    // React Native's fetch/FormData accepts this {uri, name, type} shape directly for file uploads.
    formData.append('file', {
      uri: imageUri,
      name: 'receipt.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');
  formData.append('scale', 'true');
  formData.append('detectOrientation', 'true');

  const response = await fetch(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    headers: {
      apikey: OCR_SPACE_API_KEY,
      // No Content-Type here — fetch derives the multipart boundary from the FormData body itself.
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR request failed with status ${response.status}`);
  }

  const result: OcrSpaceResponse = await response.json();

  if (result.IsErroredOnProcessing) {
    const message = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(' ') : result.ErrorMessage;
    throw new Error(message || 'OCR failed to process the receipt.');
  }

  const parsedText = result.ParsedResults?.[0]?.ParsedText;
  if (!parsedText || !parsedText.trim()) {
    throw new Error('No text detected in the receipt image.');
  }

  return parsedText;
}

// Matches decimal currency amounts specifically (always ".XX" cents) rather than any bare integer
// — that keeps receipt/phone numbers and item counts out of the candidate pool.
const CURRENCY_PATTERN = /\$?\s?(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})/g;

function parseCurrencyMatch(match: string): number | null {
  const cleaned = match.replace(/[^0-9.]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Look for the largest currency value, preferring one on a line labeled "total" (not "subtotal"). */
function extractAmount(text: string): number | null {
  let totalLineAmount: number | null = null;

  for (const line of text.split('\n')) {
    if (/total/i.test(line) && !/sub[\s-]?total/i.test(line)) {
      const matches = line.match(CURRENCY_PATTERN);
      const value = matches ? parseCurrencyMatch(matches[matches.length - 1]) : null;
      if (value !== null) {
        // Last "total"-labeled line wins — grand total typically sits below subtotal/tax.
        totalLineAmount = value;
      }
    }
  }
  if (totalLineAmount !== null) {
    return totalLineAmount;
  }

  // No labeled total found — fall back to the largest currency-shaped number anywhere in the text.
  const allMatches = text.match(CURRENCY_PATTERN);
  if (!allMatches) {
    return null;
  }
  const values = allMatches.map(parseCurrencyMatch).filter((value): value is number => value !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

/** Assume the vendor name is the first (or second, if the first is noise) line of the receipt. */
function extractVendor(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const isNoise = (line: string) => line.length < 2 || /^[\d\s.,#*-]+$/.test(line);
  return lines.slice(0, 2).find((line) => !isNoise(line)) ?? '';
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Look for a standard date format; manually constructs the Date rather than trusting engine-specific string parsing. */
function extractDate(text: string): string {
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const slashOrDashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slashOrDashMatch) {
    const [, month, day, yearRaw] = slashOrDashMatch;
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const date = new Date(year, Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const monthNameMatch = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monthNameMatch) {
    const monthIndex = MONTH_NAMES.indexOf(monthNameMatch[1].slice(0, 3).toLowerCase());
    if (monthIndex !== -1) {
      const date = new Date(Number(monthNameMatch[3]), monthIndex, Number(monthNameMatch[2]));
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // No date found on the receipt — today is the most reasonable default.
  return new Date().toISOString();
}

/** OCR.space has no concept of category, tax deductibility, or line items — those default the same way the pre-Gemini UI did. */
function parseReceiptText(rawText: string): ParsedReceiptData {
  return {
    merchant: extractVendor(rawText),
    amount: extractAmount(rawText) ?? 0,
    date: extractDate(rawText),
    category: 'Other',
    isTaxDeductible: false,
    lineItems: [],
  };
}

/** Fallback path: upload + regex-parse in one call. Never throws — reports failure as `null`. */
async function processReceiptWithOcrSpace(imageUri: string): Promise<ParsedReceiptData | null> {
  try {
    const rawText = await extractTextFromImage(imageUri);
    const parsed = parseReceiptText(rawText);
    console.log('[OCR] OCR.space regex fallback parsed:', parsed);
    return parsed;
  } catch (error) {
    console.warn('[OCR] OCR.space fallback failed:', error);
    return null;
  }
}

/**
 * Primary entry point for the scan flow: tries Gemini first (structured, most accurate), and if
 * that comes back empty — wrong/missing key, exhausted retries on a demand spike, malformed
 * response — automatically falls back to the OCR.space + regex pipeline instead of surfacing an
 * error. Only if both providers fail does this resolve to `null`, which the confirmation sheet
 * already treats as "open blank, let the user fill it in by hand."
 */
export async function processReceiptImage(imageUri: string): Promise<ParsedReceiptData | null> {
  console.log(`[OCR] processReceiptImage started (mock=${USE_MOCK_OCR}, model="${GEMINI_MODEL}")`);
  const geminiResult = await processReceiptWithGemini(imageUri);
  if (geminiResult) {
    return geminiResult;
  }

  console.log('[OCR] Gemini produced no result — falling back to OCR.space.');
  return processReceiptWithOcrSpace(imageUri);
}
