import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import ExcelJS from 'exceljs';
import { Prisma, PrismaClient, type Beneficiary, type CategoryType, type PaymentMethod } from '@prisma/client';

type SkipReason =
  | 'empty'
  | 'section'
  | 'header'
  | 'missing_date'
  | 'malformed_date'
  | 'missing_amount'
  | 'invalid_amount'
  | 'numeric_name';

type ParsedTransaction = {
  rowNumber: number;
  name: string;
  merchantName: string;
  sourceName: string;
  date: Date;
  paymentMethod: PaymentMethod;
  amount: Prisma.Decimal;
  beneficiary: Beneficiary;
  categoryName: string;
  categoryType: CategoryType;
  propertyName: string | null;
  companyName: string | null;
  justification: string | null;
  attachmentUrl: string | null;
};

type ParseResult = {
  totalRows: number;
  skipped: Record<SkipReason, number>;
  transactions: ParsedTransaction[];
  rowErrors: string[];
};

type Summary = {
  total_rows_read: number;
  skipped: Record<SkipReason, number>;
  valid_transactions: number;
  properties_would_create: Array<{ name: string; count: number }>;
  companies_would_create: Array<{ name: string; count: number }>;
  categories_would_create: string[];
  payment_method_count: Record<string, number>;
  transactions_to_insert: number;
  sample_transactions: Array<{
    row: number;
    date: string;
    merchantName: string;
    paymentMethod: PaymentMethod;
    amountTotal: string;
    propertyName: string | null;
    companyName: string | null;
    categoryName: string;
  }>;
  date_min: string | null;
  date_max: string | null;
  amount_total: string;
};

const prisma = new PrismaClient();

const COLUMN = {
  name: 1,
  company: 2,
  source: 4,
  date: 5,
  paymentMethod: 6,
  description: 7,
  amount: 8,
  files: 10,
  comment: 15,
} as const;

const SKIP_REASONS: SkipReason[] = [
  'empty',
  'section',
  'header',
  'missing_date',
  'malformed_date',
  'missing_amount',
  'invalid_amount',
  'numeric_name',
];

function usage(): never {
  console.error('Usage: DATABASE_URL=<url> npx tsx scripts/import-historic-monday.ts <path-to-xlsx> [--execute] [--force]');
  process.exit(1);
}

function textValue(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) return value.map((item) => textValue(item as ExcelJS.CellValue)).join('');
  if ('text' in value && typeof value.text === 'string') return value.text.trim();
  if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim();
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  if ('result' in value) return textValue(value.result as ExcelJS.CellValue);
  return String(value).trim();
}

function isEmptyText(value: ExcelJS.CellValue | undefined): boolean {
  return textValue(value) === '';
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseDate(value: ExcelJS.CellValue | undefined): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = textValue(value);
  if (!text || text.includes(' to ')) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: ExcelJS.CellValue | undefined): Prisma.Decimal | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Prisma.Decimal(value);
  const raw = textValue(value);
  if (!raw) return null;
  let normalized = raw.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  if (!normalized || normalized === '-' || normalized === '.') return null;
  try {
    return new Prisma.Decimal(normalized);
  } catch {
    return null;
  }
}

function isHeaderRow(values: string[]): boolean {
  const normalized = values.map(normalizeText);
  return (
    normalized[0] === 'name' ||
    (normalized.includes('name') &&
      normalized.includes('compagnie') &&
      normalized.includes('payment method') &&
      normalized.includes('montant'))
  );
}

function paymentMethodFrom(value: string): PaymentMethod {
  const normalized = normalizeText(value);
  if (['interac', 'virement interac', 'virement interact lemieux gestion de finance'].includes(normalized)) {
    return 'interac';
  }
  if (['carte de credit oli perso', 'carte de credit olivier perso', 'carte de credit orea'].includes(normalized)) {
    return 'credit_card';
  }
  if (normalized === 'carte debit') return 'debit_card';
  if (normalized === 'cash') return 'cash';
  if (normalized === 'cheque') return 'check';
  if (normalized === 'ppa' || normalized === 'prelevement automatique') return 'preauthorized_debit';
  if (['virement entre compte', 'virement fournisseurs', 'compte de banque orea'].includes(normalized)) {
    return 'wire';
  }
  return 'other';
}

function classifySource(sourceName: string): { propertyName: string | null; companyName: string | null } {
  const name = sourceName.trim();
  if (!name) return { propertyName: null, companyName: null };
  if (/^[\d-]+\s+\w/u.test(name) || /^\d/u.test(name)) {
    return { propertyName: name, companyName: null };
  }
  if (/(oréa|orea|\bbg\b|\binc\b|inc\.|capital|holding|lemieux gestion|biasafe|quebec inc|québec inc)/iu.test(name)) {
    return { propertyName: null, companyName: name };
  }
  return { propertyName: null, companyName: name };
}

function firstAttachmentUrl(files: string): string | null {
  const first = files
    .split(',')
    .map((item) => item.trim())
    .find(Boolean);
  return first || null;
}

function increment<T extends string>(record: Record<T, number>, key: T): void {
  record[key] = (record[key] ?? 0) + 1;
}

function countByName(transactions: ParsedTransaction[], field: 'propertyName' | 'companyName') {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const name = transaction[field];
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

function sortedCreateList(names: Map<string, number>, existingNames: Set<string>) {
  return [...names.entries()]
    .filter(([name]) => !existingNames.has(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

function parseWorksheet(worksheet: ExcelJS.Worksheet): ParseResult {
  const skipped = Object.fromEntries(SKIP_REASONS.map((reason) => [reason, 0])) as Record<SkipReason, number>;
  const transactions: ParsedTransaction[] = [];
  const rowErrors: string[] = [];

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells = Array.from({ length: worksheet.columnCount }, (_, index) => row.getCell(index + 1).value);
    const nonEmpty = cells.filter((cell) => !isEmptyText(cell));
    const texts = cells.map(textValue);

    if (nonEmpty.length === 0) {
      increment(skipped, 'empty');
      return;
    }
    if (nonEmpty.length === 1) {
      increment(skipped, 'section');
      return;
    }
    if (isHeaderRow(texts)) {
      increment(skipped, 'header');
      return;
    }

    const name = texts[COLUMN.name - 1] ?? '';
    if (/^\d+$/.test(name.trim())) {
      increment(skipped, 'numeric_name');
      return;
    }

    if (isEmptyText(cells[COLUMN.date - 1])) {
      increment(skipped, 'missing_date');
      return;
    }
    const date = parseDate(cells[COLUMN.date - 1]);
    if (!date) {
      increment(skipped, 'malformed_date');
      rowErrors.push(`Row ${rowNumber}: date malformee (${texts[COLUMN.date - 1]})`);
      return;
    }

    if (isEmptyText(cells[COLUMN.amount - 1])) {
      increment(skipped, 'missing_amount');
      return;
    }
    const amount = parseAmount(cells[COLUMN.amount - 1]);
    if (!amount || amount.lte(0)) {
      increment(skipped, 'invalid_amount');
      rowErrors.push(`Row ${rowNumber}: montant invalide (${texts[COLUMN.amount - 1]})`);
      return;
    }

    const company = texts[COLUMN.company - 1] ?? '';
    const sourceName = texts[COLUMN.source - 1] ?? '';
    const description = texts[COLUMN.description - 1] ?? '';
    const comment = texts[COLUMN.comment - 1] ?? '';
    const { propertyName, companyName } = classifySource(sourceName);
    const categoryName = name.trim() || 'Inconnu';
    const justificationParts = [description.trim(), comment.trim() ? `Commentaire: ${comment.trim()}` : ''].filter(Boolean);

    transactions.push({
      rowNumber,
      name: name.trim(),
      merchantName: company.trim() || name.trim() || 'Inconnu',
      sourceName,
      date,
      paymentMethod: paymentMethodFrom(texts[COLUMN.paymentMethod - 1] ?? ''),
      amount,
      beneficiary: 'company',
      categoryName,
      categoryType: 'expense',
      propertyName,
      companyName,
      justification: justificationParts.length > 0 ? justificationParts.join('\n\n') : null,
      attachmentUrl: firstAttachmentUrl(texts[COLUMN.files - 1] ?? ''),
    });
  });

  return {
    totalRows: worksheet.rowCount,
    skipped,
    transactions,
    rowErrors,
  };
}

async function buildSummary(parseResult: ParseResult): Promise<Summary> {
  const [properties, companies, categories] = await Promise.all([
    prisma.property.findMany({ select: { name: true } }),
    prisma.company.findMany({ select: { name: true } }),
    prisma.category.findMany({ select: { name: true } }),
  ]);
  const existingProperties = new Set(properties.map((item) => item.name));
  const existingCompanies = new Set(companies.map((item) => item.name));
  const existingCategories = new Set(categories.map((item) => item.name));
  const propertyCounts = countByName(parseResult.transactions, 'propertyName');
  const companyCounts = countByName(parseResult.transactions, 'companyName');
  const categoryNames = [...new Set(parseResult.transactions.map((transaction) => transaction.categoryName))].sort((a, b) =>
    a.localeCompare(b),
  );
  const paymentCounts: Record<string, number> = {};
  let amountTotal = new Prisma.Decimal(0);
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  const samples = new Map<PaymentMethod, ParsedTransaction>();

  for (const transaction of parseResult.transactions) {
    paymentCounts[transaction.paymentMethod] = (paymentCounts[transaction.paymentMethod] ?? 0) + 1;
    amountTotal = amountTotal.add(transaction.amount);
    if (!minDate || transaction.date < minDate) minDate = transaction.date;
    if (!maxDate || transaction.date > maxDate) maxDate = transaction.date;
    if (!samples.has(transaction.paymentMethod) && samples.size < 5) {
      samples.set(transaction.paymentMethod, transaction);
    }
  }

  return {
    total_rows_read: parseResult.totalRows,
    skipped: parseResult.skipped,
    valid_transactions: parseResult.transactions.length,
    properties_would_create: sortedCreateList(propertyCounts, existingProperties),
    companies_would_create: sortedCreateList(companyCounts, existingCompanies),
    categories_would_create: categoryNames.filter((name) => !existingCategories.has(name)),
    payment_method_count: paymentCounts,
    transactions_to_insert: parseResult.transactions.length,
    sample_transactions: [...samples.values()].map((transaction) => ({
      row: transaction.rowNumber,
      date: transaction.date.toISOString().slice(0, 10),
      merchantName: transaction.merchantName,
      paymentMethod: transaction.paymentMethod,
      amountTotal: transaction.amount.toFixed(2),
      propertyName: transaction.propertyName,
      companyName: transaction.companyName,
      categoryName: transaction.categoryName,
    })),
    date_min: minDate?.toISOString().slice(0, 10) ?? null,
    date_max: maxDate?.toISOString().slice(0, 10) ?? null,
    amount_total: amountTotal.toFixed(2),
  };
}

async function requireDoubleConfirmation(xlsxPath: string, transactionsCount: number): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error('Mode --execute exige un terminal interactif pour la double confirmation.');
  }
  const rl = createInterface({ input, output });
  try {
    const first = await rl.question(`Importer ${transactionsCount} transactions depuis ${xlsxPath}? Tapez IMPORT pour continuer: `);
    if (first !== 'IMPORT') throw new Error('Confirmation annulee.');
    const second = await rl.question('Confirmation finale: tapez EXECUTE pour inserer dans la DB: ');
    if (second !== 'EXECUTE') throw new Error('Confirmation finale annulee.');
  } finally {
    rl.close();
  }
}

async function executeImport(transactions: ParsedTransaction[], force: boolean, xlsxPath: string) {
  const count = await prisma.transaction.count();
  if (count > 0) {
    console.warn(
      'La DB contient deja %d transactions. Continuer? (Ctrl+C pour annuler, sinon --force pour proceder)',
      count,
    );
    if (!force) process.exit(1);
  }

  await requireDoubleConfirmation(xlsxPath, transactions.length);

  const owner = await prisma.user.findFirst({
    where: { role: 'owner' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!owner) throw new Error("Aucun utilisateur owner trouve. Seed requis avant l'import.");

  const existing = {
    properties: new Set((await prisma.property.findMany({ select: { name: true } })).map((item) => item.name)),
    companies: new Set((await prisma.company.findMany({ select: { name: true } })).map((item) => item.name)),
    categories: new Set((await prisma.category.findMany({ select: { name: true } })).map((item) => item.name)),
  };
  const propertiesCreated = new Set<string>();
  const companiesCreated = new Set<string>();
  const categoriesCreated = new Set<string>();
  const errors: string[] = [];
  let imported = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const transaction of transactions) {
        try {
          let propertyId: string | null = null;
          let companyId: string | null = null;

          if (transaction.propertyName) {
            const property =
              (await tx.property.findFirst({
                where: { name: transaction.propertyName },
                select: { id: true },
              })) ??
              (await tx.property.create({
                data: { name: transaction.propertyName },
                select: { id: true },
              }));
            propertyId = property.id;
            if (!existing.properties.has(transaction.propertyName)) propertiesCreated.add(transaction.propertyName);
          }

          if (transaction.companyName) {
            const company = await tx.company.upsert({
              where: { name: transaction.companyName },
              create: { name: transaction.companyName },
              update: {},
              select: { id: true },
            });
            companyId = company.id;
            if (!existing.companies.has(transaction.companyName)) companiesCreated.add(transaction.companyName);
          }

          const category = await tx.category.upsert({
            where: { name: transaction.categoryName },
            create: { name: transaction.categoryName, type: transaction.categoryType },
            update: {},
            select: { id: true },
          });
          if (!existing.categories.has(transaction.categoryName)) categoriesCreated.add(transaction.categoryName);

          await tx.transaction.create({
            data: {
              type: 'expense',
              date: transaction.date,
              merchantName: transaction.merchantName,
              amountBeforeTax: transaction.amount,
              gst: null,
              qst: null,
              amountTotal: transaction.amount,
              paymentMethod: transaction.paymentMethod,
              propertyId,
              companyId,
              beneficiary: transaction.beneficiary,
              invoiceNumber: null,
              justification: transaction.justification,
              attachmentUrl: transaction.attachmentUrl,
              categoryId: category.id,
              createdById: owner.id,
            },
          });
          imported += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const rowError = `Row ${transaction.rowNumber}: ${message}`;
          console.error(rowError);
          errors.push(rowError);
        }
      }
    },
    { timeout: 120_000 },
  );

  return {
    imported,
    properties_created: [...propertiesCreated].sort(),
    companies_created: [...companiesCreated].sort(),
    categories_created: [...categoriesCreated].sort(),
    errors,
  };
}

async function main() {
  const xlsxPath = process.argv[2];
  if (!xlsxPath || xlsxPath.startsWith('--')) usage();
  const execute = process.argv.includes('--execute');
  const force = process.argv.includes('--force');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Aucune feuille trouvee dans le fichier xlsx.');

  const parseResult = parseWorksheet(worksheet);
  const summary = await buildSummary(parseResult);

  console.log(execute ? 'MODE: EXECUTE' : 'MODE: DRY-RUN');
  console.log(JSON.stringify(summary, null, 2));
  if (parseResult.rowErrors.length > 0) {
    console.warn('Row warnings:');
    for (const warning of parseResult.rowErrors) console.warn(`- ${warning}`);
  }

  if (execute) {
    const result = await executeImport(parseResult.transactions, force, xlsxPath);
    console.log(JSON.stringify(result, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
