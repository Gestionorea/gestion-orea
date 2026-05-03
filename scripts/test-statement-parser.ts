import { readFileSync } from 'node:fs';
import { parseStatement, type ParsedRow } from '../src/lib/statement-parser';

const CSV_PATH = '/Users/olivierlemieux/Documents/Claude/site-gestion-orea/02-documents/releve.csv';

function isoDate(row: ParsedRow): string {
  return row.date.toISOString().slice(0, 10);
}

function amount(row: ParsedRow): number {
  return row.amountTotal.toNumber();
}

function formatRow(row: ParsedRow) {
  return {
    date: isoDate(row),
    description: row.description,
    amountTotal: Number(amount(row).toFixed(2)),
    type: row.type,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const buffer = readFileSync(CSV_PATH);
  const result = await parseStatement({ buffer, filename: 'releve.csv' });

  const expenses = result.rows
    .filter((row) => row.type === 'expense')
    .reduce((total, row) => total + amount(row), 0);
  const incomes = result.rows
    .filter((row) => row.type === 'income')
    .reduce((total, row) => total + amount(row), 0);

  console.log(`Format detected: ${result.format}`);
  console.log(`Total rows read: ${result.totalRowsRead}`);
  console.log(`Rows EOP parsed: ${result.rows.length}`);
  console.log(`Rows skipped: ${result.rowsSkipped}`);
  console.log('Warnings:');
  for (const warning of result.warnings) console.log(`  - ${warning}`);

  console.log('First 3 rows:');
  for (const row of result.rows.slice(0, 3)) console.log(`  ${JSON.stringify(formatRow(row))}`);

  console.log('Last 2 rows:');
  for (const row of result.rows.slice(-2)) console.log(`  ${JSON.stringify(formatRow(row))}`);

  console.log(`Sum expenses: ${expenses.toFixed(2)}`);
  console.log(`Sum incomes: ${incomes.toFixed(2)}`);
  console.log('');
  console.log('ASSERTIONS:');

  assert(result.rows.length === 17, `Expected 17 parsed EOP rows, got ${result.rows.length}.`);
  console.log('✓ rows.length === 17 (lignes EOP)');

  assert(result.format === 'desjardins_bank_account', `Unexpected format: ${result.format}.`);
  console.log("✓ format === 'desjardins_bank_account'");

  const first = result.rows[0];
  assert(first !== undefined, 'First parsed row missing.');
  assert(isoDate(first) === '2026-01-02', `Unexpected first date: ${isoDate(first)}.`);
  assert(first.description.includes('Location automobile'), `Unexpected first description: ${first.description}.`);
  assert(first.type === 'expense', `Unexpected first type: ${first.type}.`);
  assert(amount(first) === 330.79, `Unexpected first amount: ${amount(first)}.`);
  console.log("✓ Premiere ligne EOP: date 2026-01-02, description contient 'Location automobile', expense 330.79");

  assert(
    result.rows.some((row) => row.type === 'income' && row.description === 'Depot Mobile' && amount(row) === 7500),
    'Expected at least one Depot Mobile income of 7500.00.',
  );
  console.log('✓ Au moins 1 income (Depot Mobile 7500.00)');

  console.log('');
  console.log('RESULT: PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.log('RESULT: FAIL');
  process.exitCode = 1;
});
