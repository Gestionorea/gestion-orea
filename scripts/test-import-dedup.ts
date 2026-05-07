import { partitionImportRowsByDedup } from '../src/lib/import-dedup';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const rows = [
  { row: { label: 'active duplicate' }, dedupHash: 'active-hash' },
  { row: { label: 'deleted duplicate' }, dedupHash: 'deleted-hash' },
  { row: { label: 'new row' }, dedupHash: 'new-hash' },
];

const result = partitionImportRowsByDedup(rows, [
  { id: 'tx-active', dedupHash: 'active-hash', deletedAt: null },
  { id: 'tx-deleted', dedupHash: 'deleted-hash', deletedAt: new Date('2026-05-01T00:00:00.000Z') },
]);

assert(result.rowsToCreate.length === 1, 'Only rows without any dedup match should be created.');
assert(result.rowsToCreate[0].dedupHash === 'new-hash', 'The new row should be created.');
assert(result.rowsToRestore.length === 1, 'Deleted duplicate rows should be restorable.');
assert(result.rowsToRestore[0].transactionId === 'tx-deleted', 'The deleted transaction should be restored.');
assert(result.duplicateCount === 1, 'Only active duplicates should count as duplicates.');

console.log('import-dedup: PASS');
