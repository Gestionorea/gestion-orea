import { OwnershipValidationError, validateOwnerships } from '../src/lib/payment-source-owners';

type TestCase = {
  name: string;
  owners: Array<{ companyId: string; percent: number }>;
  shouldPass: boolean;
};

const cases: TestCase[] = [
  {
    name: '30-30-40 valide',
    owners: [
      { companyId: 'company-a', percent: 30 },
      { companyId: 'company-b', percent: 30 },
      { companyId: 'company-c', percent: 40 },
    ],
    shouldPass: true,
  },
  {
    name: '50-50 valide',
    owners: [
      { companyId: 'company-a', percent: 50 },
      { companyId: 'company-b', percent: 50 },
    ],
    shouldPass: true,
  },
  {
    name: '100 seul valide',
    owners: [{ companyId: 'company-a', percent: 100 }],
    shouldPass: true,
  },
  {
    name: '30-30-50 invalide',
    owners: [
      { companyId: 'company-a', percent: 30 },
      { companyId: 'company-b', percent: 30 },
      { companyId: 'company-c', percent: 50 },
    ],
    shouldPass: false,
  },
  {
    name: 'doublon companyId invalide',
    owners: [
      { companyId: 'company-a', percent: 50 },
      { companyId: 'company-a', percent: 50 },
    ],
    shouldPass: false,
  },
  {
    name: 'percent > 100 invalide',
    owners: [{ companyId: 'company-a', percent: 100.01 }],
    shouldPass: false,
  },
  {
    name: '0 entries valide',
    owners: [],
    shouldPass: true,
  },
];

let passed = 0;

for (const testCase of cases) {
  try {
    validateOwnerships(testCase.owners);
    if (!testCase.shouldPass) {
      console.error(`FAIL: ${testCase.name} aurait du echouer`);
      continue;
    }
    console.log(`PASS: ${testCase.name}`);
    passed += 1;
  } catch (error) {
    if (testCase.shouldPass || !(error instanceof OwnershipValidationError)) {
      console.error(`FAIL: ${testCase.name}`, error);
      continue;
    }
    console.log(`PASS: ${testCase.name}`);
    passed += 1;
  }
}

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) {
  process.exitCode = 1;
}
