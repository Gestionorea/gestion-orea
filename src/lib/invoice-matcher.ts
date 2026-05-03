export type InvoiceFile = {
  itemId: string;
  filename: string;
  webUrl: string;
  parsedDate: Date | null;
  parsedKeywords: string[];
  parsedAmount?: number | null;
};

export type MatchScore = {
  invoiceItemId: string;
  invoiceWebUrl: string;
  invoiceFilename: string;
  score: number;
  commonKeywords: string[];
  daysDiff: number;
};

export type MatchInput = {
  transactionDate: Date;
  transactionDescription: string;
  transactionAmount?: number;
  invoices: InvoiceFile[];
};

export type ExtractedMatchInput = {
  extracted: { date: Date | null; fournisseur: string | null; montantTotal: number | null };
  transactions: { id: string; date: Date; merchantName: string; amountTotal: number }[];
};

const STOPWORDS = new Set([
  'pour',
  'avec',
  'paiement',
  'virement',
  'achat',
  'mobile',
  'depot',
  'frais',
  'desjardins',
  'visa',
  'mastercard',
  'mc',
  'inc',
  'ltee',
  'enr',
]);

const MAX_DAYS_DIFF = 90;
const DEFAULT_THRESHOLD = 30;
const EXACT_AMOUNT_BONUS = 80;
const APPROX_AMOUNT_BONUS = 40;
const KEYWORD_BONUS_MAX = 30;
const DATE_PENALTY_MAX = 30;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function extractKeywords(value: string): string[] {
  const keywords = normalize(value)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  return Array.from(new Set(keywords));
}

function parseDateFromFilename(filename: string): Date | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})_/);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function extractAmountFromFilename(filename: string): number | null {
  const match = filename.match(/_(\d+\.\d{2})(\.[a-z]+)?$/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseInvoiceFilename(filename: string): {
  parsedDate: Date | null;
  parsedKeywords: string[];
  parsedAmount: number | null;
} {
  return {
    parsedDate: parseDateFromFilename(filename),
    parsedKeywords: extractKeywords(filename.replace(/^\d{4}-\d{2}-\d{2}_/, '')),
    parsedAmount: extractAmountFromFilename(filename),
  };
}

function daysBetween(left: Date, right: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const leftUtc = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate());
  const rightUtc = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate());
  return Math.abs(Math.round((leftUtc - rightUtc) / msPerDay));
}

function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((keyword) => rightSet.has(keyword));
}

function amountBonusFor(transactionAmount: number | undefined, invoiceAmount: number | null | undefined): number {
  if (!transactionAmount || !invoiceAmount) return 0;

  const amountDiff = Math.abs(invoiceAmount - transactionAmount);
  if (amountDiff <= 0.01) return EXACT_AMOUNT_BONUS;
  if (amountDiff <= transactionAmount * 0.05) return APPROX_AMOUNT_BONUS;
  return 0;
}

export function findBestMatch(input: MatchInput, threshold = DEFAULT_THRESHOLD): MatchScore | null {
  const transactionKeywords = extractKeywords(input.transactionDescription);
  let best: MatchScore | null = null;

  for (const invoice of input.invoices) {
    if (!invoice.parsedDate) continue;

    const daysDiff = daysBetween(input.transactionDate, invoice.parsedDate);
    if (daysDiff > MAX_DAYS_DIFF) continue;

    const commonKeywords = intersection(transactionKeywords, invoice.parsedKeywords);
    const denominator = Math.max(transactionKeywords.length, invoice.parsedKeywords.length, 1);
    const amountBonus = amountBonusFor(input.transactionAmount, invoice.parsedAmount);
    const keywordBonus =
      amountBonus > 0
        ? (commonKeywords.length / denominator) * KEYWORD_BONUS_MAX
        : (commonKeywords.length / denominator) * 100;
    const datePenalty =
      amountBonus > 0 ? Math.min(daysDiff / 3, DATE_PENALTY_MAX) : daysDiff * 5;
    const score = Math.round(amountBonus + keywordBonus - datePenalty);
    if (score < threshold) continue;

    const candidate: MatchScore = {
      invoiceItemId: invoice.itemId,
      invoiceWebUrl: invoice.webUrl,
      invoiceFilename: invoice.filename,
      score,
      commonKeywords,
      daysDiff,
    };

    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }

  return best;
}

export function findMatchByExtractedData(
  input: ExtractedMatchInput,
  dateToleranceDays = 5,
  amountToleranceCents = 1,
): string | null {
  const { extracted, transactions } = input;
  if (!extracted.montantTotal || !extracted.date) return null;

  const targetCents = Math.round(extracted.montantTotal * 100);
  const matches = transactions.filter((transaction) => {
    const transactionCents = Math.round(transaction.amountTotal * 100);
    if (Math.abs(transactionCents - targetCents) > amountToleranceCents) return false;

    return daysBetween(transaction.date, extracted.date as Date) <= dateToleranceDays;
  });

  if (matches.length === 1) return matches[0].id;

  if (matches.length > 1 && extracted.fournisseur) {
    const fournisseurNorm = normalize(extracted.fournisseur);
    const refined = matches.filter((transaction) => {
      const transactionNorm = normalize(transaction.merchantName);
      return transactionNorm.includes(fournisseurNorm) || fournisseurNorm.includes(transactionNorm);
    });

    if (refined.length === 1) return refined[0].id;
  }

  return null;
}
