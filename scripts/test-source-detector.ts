import { detectStatementSourceFromSources } from '../src/lib/statement-source-detector';

const sources = [
  { id: 'src-chq-1098', name: 'OREA CHQ', lastDigits: '1098' },
  { id: 'src-cc-0027', name: 'OREA Visa', lastDigits: '0027' },
  { id: 'src-cc-5025-a', name: 'LEVI Visa A', lastDigits: '5025' },
  { id: 'src-cc-5025-b', name: 'LEVI Visa B', lastDigits: '5025' },
];

type Case = {
  name: string;
  filename: string;
  expectOk: boolean;
  expectedPaymentSourceId?: string;
  expectedReasonIncludes?: string;
};

const cases: Case[] = [
  {
    name: 'nom valide CHQ',
    filename: 'OREA-CHQ-1098-2026-01.csv',
    expectOk: true,
    expectedPaymentSourceId: 'src-chq-1098',
  },
  {
    name: 'nom invalide',
    filename: 'bad-file.csv',
    expectOk: false,
    expectedReasonIncludes: 'convention',
  },
  {
    name: 'lastDigits inexistant',
    filename: 'OREA-CC-9999-2026-01.csv',
    expectOk: false,
    expectedReasonIncludes: 'Aucun PaymentSource',
  },
  {
    name: 'plusieurs matches',
    filename: 'LEVI-CC-5025-2026-01.csv',
    expectOk: false,
    expectedReasonIncludes: 'Plusieurs PaymentSource',
  },
  {
    name: 'format BANK',
    filename: 'OREA-BANK-1098-2026-01.csv',
    expectOk: true,
    expectedPaymentSourceId: 'src-chq-1098',
  },
  {
    name: 'mois invalide',
    filename: 'OREA-CC-0027-2026-13.csv',
    expectOk: false,
    expectedReasonIncludes: 'Mois invalide',
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = detectStatementSourceFromSources(testCase.filename, sources);
  const ok =
    result.ok === testCase.expectOk &&
    (result.ok
      ? result.paymentSourceId === testCase.expectedPaymentSourceId
      : !testCase.expectedReasonIncludes || result.reason.includes(testCase.expectedReasonIncludes));

  if (ok) {
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } else {
    console.error(`FAIL ${testCase.name}`, result);
  }
}

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exit(1);
