import { expandSynonyms, matchesExpandedSearch } from '../src/lib/category-synonyms';

const expansionTests = [
  { query: 'auto', expects: ['voiture', 'vehicule', 'automobile'] },
  { query: 'voiture', expects: ['auto', 'vehicule'] },
  { query: 'essence', expects: ['carburant', 'gaz'] },
  { query: 'bouffe', expects: ['restaurant', 'resto'] },
  { query: 'hydro', expects: ['electricite', 'energie'] },
  { query: 'internet', expects: ['telecom', 'bell'] },
];

const matchTests = [
  { categoryName: 'Vehicule', search: 'auto', expected: true },
  { categoryName: 'Restaurant', search: 'bouffe', expected: true },
  { categoryName: 'Electricite', search: 'hydro', expected: true },
  { categoryName: 'Telecommunications', search: 'internet', expected: true },
  { categoryName: 'Assurance', search: 'beneva', expected: true },
  { categoryName: 'Vehicule', search: 'random_xyz', expected: false },
];

let pass = 0;
let fail = 0;

for (const test of expansionTests) {
  const result = expandSynonyms(test.query);
  const ok = test.expects.every((expected) => result.includes(expected));
  if (ok) {
    console.log(`PASS expandSynonyms("${test.query}") includes ${test.expects.join(', ')}`);
    pass++;
  } else {
    console.error(
      `FAIL expandSynonyms("${test.query}") = [${result.join(', ')}], expected to include ${test.expects.join(', ')}`,
    );
    fail++;
  }
}

for (const test of matchTests) {
  const expanded = expandSynonyms(test.search);
  const result = matchesExpandedSearch(test.categoryName, expanded);
  if (result === test.expected) {
    console.log(`PASS matchesExpandedSearch("${test.categoryName}", "${test.search}") = ${result}`);
    pass++;
  } else {
    console.error(
      `FAIL matchesExpandedSearch("${test.categoryName}", "${test.search}") = ${result}, expected ${test.expected}`,
    );
    fail++;
  }
}

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);
