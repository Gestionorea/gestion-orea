import { PdfStatementSchema, extractPdfStatement, pdfTransactionsToParsedRows } from '../src/lib/pdf-statement-extractor';

let passed = 0;

const valid = { transactions: [{ date: '2026-02-15', description: 'Tim Hortons', amount: 5.45 }] };
const r1 = PdfStatementSchema.safeParse(valid);
if (r1.success) {
  console.log('PASS schema valide');
  passed += 1;
} else {
  console.log(`FAIL ${r1.error.message}`);
}

const invalid = { transactions: [{ date: '2026/02/15', description: 'X', amount: 5.45 }] };
const r2 = PdfStatementSchema.safeParse(invalid);
if (!r2.success) {
  console.log('PASS schema rejette mauvais format date');
  passed += 1;
} else {
  console.log('FAIL devrait rejeter');
}

const transactions = [
  { date: '2026-02-15', description: 'Achat', amount: 245.67 },
  { date: '2026-02-20', description: 'Paiement recu', amount: -500.0 },
];
const rows = pdfTransactionsToParsedRows(transactions);
const conversionOk =
  rows.length === 2 &&
  rows[0].type === 'expense' &&
  Number(rows[0].amountTotal) === 245.67 &&
  rows[1].type === 'income' &&
  Number(rows[1].amountTotal) === 500.0;
if (conversionOk) {
  console.log('PASS conversion ParsedRow');
  passed += 1;
} else {
  console.log('FAIL conversion');
}

delete process.env.ANTHROPIC_API_KEY;
const r4 = await extractPdfStatement({ base64: 'fake', filename: 'test.pdf' });
if (!r4.ok && r4.error.includes('ANTHROPIC_API_KEY')) {
  console.log('PASS missing env detected');
  passed += 1;
} else {
  console.log('FAIL missing env');
}

process.env.ANTHROPIC_API_KEY = 'sk-test-fake';
const big = 'A'.repeat(7 * 1024 * 1024);
const r5 = await extractPdfStatement({ base64: big, filename: 'big.pdf' });
if (!r5.ok && r5.error.includes('too large')) {
  console.log('PASS large file guard');
  passed += 1;
} else {
  console.log('FAIL large file guard');
}

console.log(`${passed}/5 PASS`);
if (passed !== 5) {
  process.exitCode = 1;
}
