// Free-tier OCR via api.ocr.space. The "helloworld" key is their public
// testing key — shared, rate-limited (500 req/day per IP), and capped at
// 1MB per image. Swap for a real key (and probably a paid tier) before
// shipping; see the quality knob in app/(tabs)/scan.tsx that keeps captures
// under that cap.
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

/**
 * Uploads the captured receipt to OCR.space and returns the raw recognized
 * text block. Throws on any failure (network, HTTP, or an OCR-side parse
 * error) — callers decide the fallback UX; this function only reports.
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  const formData = new FormData();
  // React Native's fetch/FormData accepts this {uri, name, type} shape
  // directly for file uploads — no need to read the file into memory first.
  formData.append('file', {
    uri: imageUri,
    name: 'receipt.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');
  formData.append('scale', 'true');
  formData.append('detectOrientation', 'true');

  const response = await fetch(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    headers: {
      apikey: OCR_SPACE_API_KEY,
      // No Content-Type here — fetch derives the multipart boundary from
      // the FormData body itself; setting it manually breaks the upload.
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

export interface ParsedReceiptData {
  merchant: string;
  /** Positive magnitude — sign convention is the caller's concern, not parsing's. */
  amount: number;
  /** ISO 8601 date string. */
  date: string;
  rawText: string;
}

// Matches decimal currency amounts specifically (always ".XX" cents) rather
// than any bare integer — that keeps receipt/phone numbers and item counts
// out of the candidate pool without needing a real currency parser.
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
        // Last "total"-labeled line wins — grand total typically sits below
        // subtotal/tax on a receipt.
        totalLineAmount = value;
      }
    }
  }
  if (totalLineAmount !== null) {
    return totalLineAmount;
  }

  // No labeled total found — fall back to the largest currency-shaped
  // number anywhere in the receipt (usually the grand total).
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

/** Pure text → structured-guess parser. No network calls, so it's cheap to unit test independent of the OCR round-trip. */
export function parseReceiptText(rawText: string): ParsedReceiptData {
  return {
    merchant: extractVendor(rawText),
    amount: extractAmount(rawText) ?? 0,
    date: extractDate(rawText),
    rawText,
  };
}

/** Convenience wrapper: upload + parse in one call. Throws under the same conditions as `extractTextFromImage`. */
export async function processReceiptImage(imageUri: string): Promise<ParsedReceiptData> {
  const rawText = await extractTextFromImage(imageUri);
  return parseReceiptText(rawText);
}
