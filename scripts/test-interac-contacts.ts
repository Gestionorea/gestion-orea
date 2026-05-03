import { extractInteracName } from '../src/lib/interac-contacts';

const cases = [
  {
    name: 'format Desjardins standard',
    description: 'VIREMENT INTERAC A /BRUNO VIGNOLA /MONTREAL',
    expected: 'BRUNO VIGNOLA',
  },
  {
    name: 'accent et espaces multiples nettoyes',
    description: 'Virement Interac à /  Marie   Tremblay  / REF 123',
    expected: 'Marie Tremblay',
  },
  {
    name: 'non interac retourne null',
    description: 'Paiement /VISA DESJARDINS 01/26',
    expected: null,
  },
  {
    name: 'interac sans separateur final retourne null',
    description: 'Virement Interac a /Nom Incomplet',
    expected: null,
  },
];

let passed = 0;

for (const testCase of cases) {
  const actual = extractInteracName(testCase.description);
  if (actual === testCase.expected) {
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } else {
    console.error(`FAIL ${testCase.name}`, { expected: testCase.expected, actual });
  }
}

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exit(1);
