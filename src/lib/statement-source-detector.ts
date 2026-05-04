import { listPaymentSources, type PaymentSourceItem } from './paymentSources';

export type StatementRawMatch = {
  company: string;
  type: string;
  lastDigits: string;
  year: number;
  month: number;
};

export type DetectionResult =
  | { ok: true; paymentSourceId: string; period: { year: number; month: number } }
  | { ok: false; reason: string; rawMatch?: StatementRawMatch };

const FILENAME_REGEX = /^([A-Z0-9]+)-(CC|CHQ|BANK)-(\d{4})-(\d{4})-(\d{2})\.(csv|pdf|xlsx|xls)$/i;

function rawMatchFromRegex(match: RegExpMatchArray): StatementRawMatch {
  const [, companyRaw, typeRaw, lastDigits, yearStr, monthStr] = match;
  return {
    company: companyRaw.toUpperCase(),
    type: typeRaw.toUpperCase(),
    lastDigits,
    year: Number(yearStr),
    month: Number(monthStr),
  };
}

export function detectStatementSourceFromSources(
  filename: string,
  sources: Pick<PaymentSourceItem, 'id' | 'name' | 'lastDigits'>[],
): DetectionResult {
  const match = filename.match(FILENAME_REGEX);
  if (!match) {
    return {
      ok: false,
      reason: 'Nom de fichier ne suit pas la convention <COMPANY>-<TYPE>-<DIGITS>-<YYYY>-<MM>.<csv|pdf|xlsx>',
    };
  }

  const rawMatch = rawMatchFromRegex(match);
  if (!Number.isInteger(rawMatch.year) || rawMatch.year < 2000 || rawMatch.year > 2100) {
    return { ok: false, reason: 'Année invalide dans le nom de fichier', rawMatch };
  }

  if (!Number.isInteger(rawMatch.month) || rawMatch.month < 1 || rawMatch.month > 12) {
    return { ok: false, reason: 'Mois invalide dans le nom de fichier', rawMatch };
  }

  const matching = sources.filter((source) => source.lastDigits === rawMatch.lastDigits);

  if (matching.length === 0) {
    return {
      ok: false,
      reason: `Aucun PaymentSource avec lastDigits=${rawMatch.lastDigits}`,
      rawMatch,
    };
  }

  if (matching.length > 1) {
    return {
      ok: false,
      reason: `Plusieurs PaymentSource avec lastDigits=${rawMatch.lastDigits}: ${matching
        .map((source) => source.name)
        .join(', ')}`,
      rawMatch,
    };
  }

  return {
    ok: true,
    paymentSourceId: matching[0].id,
    period: { year: rawMatch.year, month: rawMatch.month },
  };
}

export async function detectStatementSource(filename: string): Promise<DetectionResult> {
  const sources = await listPaymentSources({ archived: false });
  return detectStatementSourceFromSources(filename, sources);
}
