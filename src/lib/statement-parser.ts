import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { Decimal } from '@prisma/client/runtime/library';

export type StatementFormat = 'desjardins_bank_account';

export type ParsedRow = {
  date: Date;
  description: string;
  amountTotal: Decimal;
  type: 'income' | 'expense';
  rawRowNumber: number;
};

export type ParseResult = {
  format: StatementFormat;
  rows: ParsedRow[];
  warnings: string[];
  totalRowsRead: number;
  rowsSkipped: number;
};

export type ParseInput = {
  buffer: Buffer;
  filename: string;
  format?: StatementFormat;
};

class StatementParserError extends Error {}

type StatementAdapter = {
  parseRows: (records: string[][]) => ParseResult;
};

type FileType = 'csv' | 'xlsx';

const DESJARDINS_CODES = new Set(['EOP', 'ET1']);

const adapters: Record<StatementFormat, StatementAdapter> = {
  desjardins_bank_account: {
    parseRows: parseDesjardinsBankAccount,
  },
};

function detectFileType(input: ParseInput): FileType {
  const filename = input.filename.toLowerCase();
  const zipSignature = input.buffer.subarray(0, 2).toString('hex').toLowerCase() === '504b';

  if (filename.endsWith('.xlsx') || zipSignature) return 'xlsx';
  return 'csv';
}

function parseCsvRecords(buffer: Buffer): string[][] {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();

  return lines.map((line) => {
    const normalizedLine = line.replace(/\r$/, '');
    if (normalizedLine.trim() === '') return [];

    const records = parse(normalizedLine, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: false,
    }) as string[][];
    return records[0] ?? [];
  });
}

async function parseXlsxRecords(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  throw new StatementParserError('XLSX support pas encore implemente pour ce format.');
}

function isEmptyRecord(record: string[]): boolean {
  return record.length === 0 || record.every((value) => String(value ?? '').trim() === '');
}

function detectFormat(records: string[][]): StatementFormat {
  const candidate = records.find((record) => !isEmptyRecord(record));
  if (!candidate) throw new StatementParserError('Statement file is empty.');

  const code = String(candidate[2] ?? '').trim();
  if (candidate.length >= 14 && (DESJARDINS_CODES.has(code) || code.length > 0)) {
    return 'desjardins_bank_account';
  }

  throw new StatementParserError('Unable to detect statement format.');
}

function parseDesjardinsDate(value: string): Date {
  const parts = value.trim().split('/');
  if (parts.length !== 3) throw new StatementParserError(`Date Desjardins invalide: ${value}`);

  const [yearRaw, monthRaw, dayRaw] = parts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new StatementParserError(`Date Desjardins invalide: ${value}`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new StatementParserError(`Date Desjardins invalide: ${value}`);
  }

  return date;
}

function parseAmount(value: string | undefined): number | null {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/"/g, '');
  if (!normalized) return null;

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function warning(line: number, message: string): string {
  return `Ligne ${line} ${message}`;
}

function parseDesjardinsBankAccount(records: string[][]): ParseResult {
  const rows: ParsedRow[] = [];
  const warnings: string[] = [];
  let rowsSkipped = 0;
  let eopSeen = 0;

  records.forEach((record, index) => {
    const rawRowNumber = index + 1;
    if (isEmptyRecord(record)) {
      rowsSkipped += 1;
      return;
    }

    const code = String(record[2] ?? '').trim();
    if (code !== 'EOP') {
      rowsSkipped += 1;
      warnings.push(warning(rawRowNumber, `ignoree: code ${code || '(vide)'} non supporte`));
      return;
    }

    eopSeen += 1;
    const description = String(record[5] ?? '').trim();
    const debit = parseAmount(record[7]);
    const credit = parseAmount(record[8]);

    if (!description) {
      rowsSkipped += 1;
      warnings.push(warning(rawRowNumber, 'ignoree: description vide'));
      return;
    }

    if ((debit === null && credit === null) || (debit !== null && credit !== null)) {
      rowsSkipped += 1;
      warnings.push(warning(rawRowNumber, 'ignoree: montant debit/credit invalide'));
      return;
    }

    const amount = debit ?? credit;
    if (amount === null || amount <= 0) {
      rowsSkipped += 1;
      warnings.push(warning(rawRowNumber, 'ignoree: montant non positif'));
      return;
    }

    try {
      rows.push({
        date: parseDesjardinsDate(String(record[3] ?? '')),
        description,
        amountTotal: new Decimal(amount.toFixed(2)),
        type: debit !== null ? 'expense' : 'income',
        rawRowNumber,
      });
    } catch (error) {
      rowsSkipped += 1;
      warnings.push(warning(rawRowNumber, `ignoree: ${error instanceof Error ? error.message : String(error)}`));
    }
  });

  if (eopSeen === 0) {
    warnings.push('Aucune ligne EOP detectee dans le releve Desjardins.');
  }

  return {
    format: 'desjardins_bank_account',
    rows,
    warnings,
    totalRowsRead: records.length,
    rowsSkipped,
  };
}

export async function parseStatement(input: ParseInput): Promise<ParseResult> {
  if (input.buffer.length === 0) throw new StatementParserError('Statement file is empty.');

  const fileType = detectFileType(input);
  const records = fileType === 'csv' ? parseCsvRecords(input.buffer) : await parseXlsxRecords(input.buffer);
  if (records.length === 0) throw new StatementParserError('Statement file is empty.');

  const format = input.format ?? detectFormat(records);
  return adapters[format].parseRows(records);
}
