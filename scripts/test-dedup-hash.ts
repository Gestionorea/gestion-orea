import { Decimal } from '@prisma/client/runtime/library';
import { computeDedupHash } from '../src/lib/dedup-hash';

type SmokeTest = {
  name: string;
  run: () => void;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const baseInput = {
  date: '2026-04-15',
  amountTotal: 245.67,
  description: 'Bureau en gros',
  paymentSourceId: 'src_123',
};

const tests: SmokeTest[] = [
  {
    name: 'Test 1 (idempotence)',
    run: () => {
      const a = computeDedupHash(baseInput);
      const b = computeDedupHash(baseInput);
      assert(a === b, 'Same inputs should return the same hash.');
    },
  },
  {
    name: 'Test 2 (date format)',
    run: () => {
      const a = computeDedupHash(baseInput);
      const b = computeDedupHash({ ...baseInput, date: new Date('2026-04-15T10:30:00Z') });
      assert(a === b, 'Date string and Date object should return the same hash.');
    },
  },
  {
    name: 'Test 3 (description normalization)',
    run: () => {
      const a = computeDedupHash({ ...baseInput, description: 'BUREAU EN GROS' });
      const b = computeDedupHash({ ...baseInput, description: 'Bureau   en  gros' });
      const c = computeDedupHash({ ...baseInput, description: 'bureau-en-gros!' });
      assert(a === b && b === c, 'Case, spacing, and punctuation should normalize to the same hash.');
    },
  },
  {
    name: 'Test 4 (different inputs)',
    run: () => {
      const a = computeDedupHash({ date: '2026-04-15', amountTotal: 245.67, description: 'X', paymentSourceId: 'src_1' });
      const b = computeDedupHash({ date: '2026-04-15', amountTotal: 245.67, description: 'X', paymentSourceId: 'src_2' });
      assert(a !== b, 'Different paymentSourceId values should return different hashes.');
    },
  },
  {
    name: 'Test 5 (amount variants)',
    run: () => {
      const a = computeDedupHash({ ...baseInput, amountTotal: new Decimal('245.67') });
      const b = computeDedupHash({ ...baseInput, amountTotal: 245.67 });
      const c = computeDedupHash({ ...baseInput, amountTotal: '245.67' });
      assert(a === b && b === c, 'Decimal, number, and string amounts should return the same hash.');
    },
  },
  {
    name: 'Test 6 (hash format)',
    run: () => {
      const hash = computeDedupHash(baseInput);
      assert(/^[a-f0-9]{64}$/.test(hash), 'Hash should be 64 lowercase hexadecimal characters.');
    },
  },
  {
    name: 'Test 7 (empty description)',
    run: () => {
      expectThrows(
        () => computeDedupHash({ ...baseInput, description: '   ' }),
        'Empty description should throw.',
      );
    },
  },
  {
    name: 'Test 8 (empty paymentSourceId)',
    run: () => {
      expectThrows(
        () => computeDedupHash({ ...baseInput, paymentSourceId: '   ' }),
        'Empty paymentSourceId should throw.',
      );
    },
  },
];

let passed = 0;

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`✓ ${test.name}: PASS`);
  } catch (error) {
    console.error(`✗ ${test.name}: FAIL`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

console.log(`RESULT: ${passed}/${tests.length} PASS`);
if (passed !== tests.length) process.exitCode = 1;
