import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const XLSX_DIR = '/Users/olivierlemieux/Desktop/import orea';
const FILE_COMPAGNIES = `${XLSX_DIR}/Compagnie_1777829263.xlsx`;
const FILE_COMPTES = `${XLSX_DIR}/Compte_de_banque_1777829142.xlsx`;
const FILES_IMMEUBLES = [
  `${XLSX_DIR}/immeubles.xlsx`,
  `${XLSX_DIR}/immeubles (1).xlsx`,
];

type CompanyImport = {
  name: string;
  status: string;
  address: string | null;
};

type AccountImport = {
  ownerCompanyName: string;
  status: string;
  numero: string;
  description: string | null;
  suffix: string;
  lastDigits: string;
};

type PropertyImport = {
  adresse: string;
  ville: string;
  companyName: string;
};

type PlannedPaymentSource = {
  name: string;
  lastDigits: string;
  ownerCompanyName: string;
  ownerCompanyId: string | null;
  description: string | null;
  suffix: string;
};

type PlannedProperty = {
  name: string;
  address: string;
  companyName: string;
  companyId: string | null;
};

function normalizeName(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function textValue(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) return value.map((item) => textValue(item as ExcelJS.CellValue)).join('').trim();
  if ('text' in value && typeof value.text === 'string') return value.text.trim();
  if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim();
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  if ('result' in value) return textValue(value.result as ExcelJS.CellValue);
  return String(value).trim();
}

function extractLastDigits(numero: string): string | null {
  const match = numero.match(/^(\d+)-/);
  if (!match) return null;
  return match[1].slice(-4);
}

function accountSuffix(numero: string): string {
  return numero.split('-').pop()?.trim() || '';
}

function suffixLabel(suffix: string): string {
  if (suffix === 'EOP') return 'Cheque';
  if (suffix === 'ET1') return 'Epargne';
  return suffix || 'Compte';
}

function compactUniqueByNormalizedName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = normalizeName(item.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function readCompanies(): Promise<CompanyImport[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_COMPAGNIES);
  const worksheet = workbook.getWorksheet('compagnie') ?? workbook.worksheets[0];
  const out: CompanyImport[] = [];

  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex < 4) return;

    const name = textValue(row.getCell(1).value);
    const status = textValue(row.getCell(2).value);
    const address = textValue(row.getCell(12).value) || null;
    if (!name) return;

    out.push({ name, status, address });
  });

  return compactUniqueByNormalizedName(out);
}

async function readAccounts(): Promise<AccountImport[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_COMPTES);
  const worksheet = workbook.getWorksheet('compte de banque') ?? workbook.worksheets[0];
  const out: AccountImport[] = [];

  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex < 4) return;

    const ownerCompanyName = textValue(row.getCell(1).value);
    const status = textValue(row.getCell(2).value);
    const numero = textValue(row.getCell(3).value);
    const description = textValue(row.getCell(6).value) || null;
    if (!ownerCompanyName || !numero || status !== 'Actif') return;

    const lastDigits = extractLastDigits(numero);
    if (!lastDigits) return;

    out.push({
      ownerCompanyName,
      status,
      numero,
      description,
      suffix: accountSuffix(numero),
      lastDigits,
    });
  });

  return out;
}

async function readProperties(): Promise<PropertyImport[]> {
  const seen = new Map<string, PropertyImport>();

  for (const file of FILES_IMMEUBLES) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(file);
    } catch (error) {
      console.warn(`Skip immeubles file (not found or unreadable): ${file}`);
      continue;
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) continue;

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex < 2) return;

      const adresse = textValue(row.getCell(1).value);
      const ville = textValue(row.getCell(2).value);
      const companyName = textValue(row.getCell(8).value);
      if (!adresse || !companyName) return;

      const key = normalizeName(adresse);
      if (seen.has(key)) return; // dedupe across files
      seen.set(key, { adresse, ville, companyName });
    });
  }

  return [...seen.values()];
}

async function loadCompanyMaps() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  return {
    companies,
    byNorm: new Map(companies.map((company) => [normalizeName(company.name), company])),
  };
}

function referencedCompanyNames(accounts: AccountImport[], properties: PropertyImport[]): string[] {
  const byNorm = new Map<string, string>();
  for (const account of accounts) {
    byNorm.set(normalizeName(account.ownerCompanyName), account.ownerCompanyName);
  }
  for (const property of properties) {
    byNorm.set(normalizeName(property.companyName), property.companyName);
  }
  return [...byNorm.values()].sort((a, b) => a.localeCompare(b));
}

async function main() {
  console.log(`MODE: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('Reading XLSX files...');

  const [companiesData, accountsData, propertiesData] = await Promise.all([
    readCompanies(),
    readAccounts(),
    readProperties(),
  ]);

  console.log(
    JSON.stringify(
      {
        files_read: {
          companies: FILE_COMPAGNIES,
          accounts: FILE_COMPTES,
          properties: FILES_IMMEUBLES,
        },
        rows_read: {
          companies: companiesData.length,
          active_accounts: accountsData.length,
          properties: propertiesData.length,
        },
      },
      null,
      2,
    ),
  );

  const existingCompanyMap = await loadCompanyMaps();
  const companiesToCreate: CompanyImport[] = [];
  const plannedCompaniesByNorm = new Map<string, CompanyImport>();

  for (const company of companiesData) {
    const norm = normalizeName(company.name);
    if (existingCompanyMap.byNorm.has(norm) || plannedCompaniesByNorm.has(norm)) continue;
    plannedCompaniesByNorm.set(norm, company);
    companiesToCreate.push(company);
  }

  const autoAddedCompanies: string[] = [];
  for (const name of referencedCompanyNames(accountsData, propertiesData)) {
    const norm = normalizeName(name);
    if (existingCompanyMap.byNorm.has(norm) || plannedCompaniesByNorm.has(norm)) continue;
    const company = { name, status: 'Active (auto-added from references)', address: null };
    autoAddedCompanies.push(name);
    plannedCompaniesByNorm.set(norm, company);
    companiesToCreate.push(company);
  }

  console.log('\n--- COMPANIES ---');
  console.log(
    JSON.stringify(
      {
        already_exist: existingCompanyMap.companies.length,
        to_create: companiesToCreate.length,
        auto_added_from_references: autoAddedCompanies.length,
        auto_added_names: autoAddedCompanies,
        sample_to_create: companiesToCreate.slice(0, 5).map((company) => company.name),
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    for (const company of companiesToCreate) {
      await prisma.company.create({ data: { name: company.name } });
    }
    console.log(`OK: Created ${companiesToCreate.length} companies`);
  }

  const refreshedCompanyMap = APPLY ? await loadCompanyMaps() : existingCompanyMap;
  const plannedCompanyNamesByNorm = new Map<string, string>();
  for (const company of companiesToCreate) {
    plannedCompanyNamesByNorm.set(normalizeName(company.name), company.name);
  }

  const existingSources = await prisma.paymentSource.findMany({
    select: { id: true, lastDigits: true, ownerCompanyId: true, name: true },
  });
  const sourcesToCreate: PlannedPaymentSource[] = [];
  const sourcesSkipped: Array<{ reason: string; ownerCompanyName: string; numero: string; lastDigits: string }> = [];

  for (const account of accountsData) {
    const ownerNorm = normalizeName(account.ownerCompanyName);
    const ownerCompany = refreshedCompanyMap.byNorm.get(ownerNorm);
    const plannedCompanyName = plannedCompanyNamesByNorm.get(ownerNorm);

    if (!ownerCompany && !plannedCompanyName) {
      sourcesSkipped.push({
        reason: 'Company not found',
        ownerCompanyName: account.ownerCompanyName,
        numero: account.numero,
        lastDigits: account.lastDigits,
      });
      continue;
    }

    const exists = ownerCompany
      ? existingSources.some(
          (source) => source.lastDigits === account.lastDigits && source.ownerCompanyId === ownerCompany.id,
        )
      : false;

    if (exists) {
      sourcesSkipped.push({
        reason: 'Already exists',
        ownerCompanyName: account.ownerCompanyName,
        numero: account.numero,
        lastDigits: account.lastDigits,
      });
      continue;
    }

    sourcesToCreate.push({
      name: `${account.ownerCompanyName} - ${suffixLabel(account.suffix)} (${account.lastDigits})`,
      lastDigits: account.lastDigits,
      ownerCompanyName: account.ownerCompanyName,
      ownerCompanyId: ownerCompany?.id ?? null,
      description: account.description,
      suffix: account.suffix,
    });
  }

  console.log('\n--- PAYMENT SOURCES ---');
  console.log(
    JSON.stringify(
      {
        already_exist: existingSources.length,
        to_create: sourcesToCreate.length,
        skipped: sourcesSkipped.length,
        skipped_details: sourcesSkipped.slice(0, 10),
        sample_to_create: sourcesToCreate.slice(0, 5).map((source) => ({
          name: source.name,
          lastDigits: source.lastDigits,
          ownerCompanyName: source.ownerCompanyName,
        })),
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    for (const source of sourcesToCreate) {
      if (!source.ownerCompanyId) {
        throw new Error(`Missing ownerCompanyId for payment source ${source.name}`);
      }
      await prisma.paymentSource.create({
        data: {
          name: source.name,
          kind: 'bank_account',
          lastDigits: source.lastDigits,
          isPersonal: false,
          ownerCompanyId: source.ownerCompanyId,
          archived: false,
        },
      });
    }
    console.log(`OK: Created ${sourcesToCreate.length} payment sources`);
  }

  const existingProperties = await prisma.property.findMany({ select: { id: true, name: true, companyId: true } });
  const existingPropertiesByKey = new Set(
    existingProperties.map((property) => `${normalizeName(property.name)}|${property.companyId ?? ''}`),
  );
  const propertiesToCreate: PlannedProperty[] = [];
  const propertiesSkipped: Array<{ reason: string; adresse: string; companyName: string }> = [];

  for (const property of propertiesData) {
    const companyNorm = normalizeName(property.companyName);
    const ownerCompany = refreshedCompanyMap.byNorm.get(companyNorm);
    const plannedCompanyName = plannedCompanyNamesByNorm.get(companyNorm);

    if (!ownerCompany && !plannedCompanyName) {
      propertiesSkipped.push({
        reason: 'Company not found',
        adresse: property.adresse,
        companyName: property.companyName,
      });
      continue;
    }

    const key = `${normalizeName(property.adresse)}|${ownerCompany?.id ?? ''}`;
    if (ownerCompany && existingPropertiesByKey.has(key)) {
      propertiesSkipped.push({
        reason: 'Already exists',
        adresse: property.adresse,
        companyName: property.companyName,
      });
      continue;
    }

    propertiesToCreate.push({
      name: property.adresse,
      address: property.ville ? `${property.adresse}, ${property.ville}` : property.adresse,
      companyName: property.companyName,
      companyId: ownerCompany?.id ?? null,
    });
  }

  console.log('\n--- PROPERTIES ---');
  console.log(
    JSON.stringify(
      {
        already_exist: existingProperties.length,
        to_create: propertiesToCreate.length,
        skipped: propertiesSkipped.length,
        skipped_details: propertiesSkipped.slice(0, 10),
        sample_to_create: propertiesToCreate.slice(0, 5).map((property) => ({
          name: property.name,
          address: property.address,
          companyName: property.companyName,
        })),
      },
      null,
      2,
    ),
  );

  if (APPLY) {
    for (const property of propertiesToCreate) {
      if (!property.companyId) {
        throw new Error(`Missing companyId for property ${property.name}`);
      }
      await prisma.property.create({
        data: {
          name: property.name,
          address: property.address,
          companyId: property.companyId,
        },
      });
    }
    console.log(`OK: Created ${propertiesToCreate.length} properties`);
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'apply' : 'dry-run',
        companies_to_create: companiesToCreate.length,
        payment_sources_to_create: sourcesToCreate.length,
        properties_to_create: propertiesToCreate.length,
        skipped_payment_sources: sourcesSkipped.length,
        skipped_properties: propertiesSkipped.length,
      },
      null,
      2,
    ),
  );

  console.log(APPLY ? 'OK: APPLY done.' : 'DRY-RUN done. Relancer avec --apply pour appliquer.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
