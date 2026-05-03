import { detectCategoryByKeywords } from '../src/lib/keyword-detector';

const categories = [
  { id: 'cat-card', name: 'Paiement carte', type: 'expense' as const, description: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'cat-insurance', name: 'Assurance', type: 'expense' as const, description: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'cat-vehicle', name: 'Véhicule', type: 'expense' as const, description: null, createdAt: new Date(), updatedAt: new Date() },
];

const cases = [
  {
    name: 'visa detecte paiement carte',
    description: 'Paiement /VISA DESJARDINS 01/26',
    expectedCategoryId: 'cat-card',
    expectedConfidence: 'high',
  },
  {
    name: 'beneva detecte assurance',
    description: 'BENEVA assurance auto',
    expectedCategoryId: 'cat-insurance',
    expectedConfidence: 'high',
  },
  {
    name: 'sci lease detecte vehicule',
    description: 'SCI LEASE Location automobile',
    expectedCategoryId: 'cat-vehicle',
    expectedConfidence: 'high',
  },
  {
    name: 'aucun keyword reconnu',
    description: 'Bureau en gros',
    expectedCategoryId: null,
    expectedConfidence: 'low',
  },
  {
    name: 'description vide',
    description: '',
    expectedCategoryId: null,
    expectedConfidence: 'none',
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = detectCategoryByKeywords(testCase.description, categories);
  const ok =
    result.categoryId === testCase.expectedCategoryId &&
    result.confidence === testCase.expectedConfidence;

  if (ok) {
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } else {
    console.error(`FAIL ${testCase.name}`, result);
  }
}

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exit(1);
