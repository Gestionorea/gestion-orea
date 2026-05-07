export type DedupImportRow<T> = {
  row: T;
  dedupHash: string;
};

export type ExistingDedupTransaction = {
  id: string;
  dedupHash: string | null;
  deletedAt: Date | null;
};

export type ImportDedupPartition<T> = {
  rowsToCreate: DedupImportRow<T>[];
  rowsToRestore: Array<DedupImportRow<T> & { transactionId: string }>;
  duplicateCount: number;
};

export function partitionImportRowsByDedup<T>(
  rows: DedupImportRow<T>[],
  existingTransactions: ExistingDedupTransaction[],
): ImportDedupPartition<T> {
  const activeHashes = new Set(
    existingTransactions.flatMap((transaction) =>
      transaction.dedupHash && transaction.deletedAt === null ? [transaction.dedupHash] : [],
    ),
  );
  const deletedByHash = new Map(
    existingTransactions.flatMap((transaction) =>
      transaction.dedupHash && transaction.deletedAt !== null
        ? [[transaction.dedupHash, transaction.id] as const]
        : [],
    ),
  );
  const seenCreateHashes = new Set<string>();
  const seenRestoreHashes = new Set<string>();
  const rowsToCreate: DedupImportRow<T>[] = [];
  const rowsToRestore: Array<DedupImportRow<T> & { transactionId: string }> = [];
  let duplicateCount = 0;

  for (const row of rows) {
    if (activeHashes.has(row.dedupHash)) {
      duplicateCount += 1;
      continue;
    }

    const deletedTransactionId = deletedByHash.get(row.dedupHash);
    if (deletedTransactionId) {
      if (seenRestoreHashes.has(row.dedupHash)) {
        duplicateCount += 1;
        continue;
      }

      rowsToRestore.push({ ...row, transactionId: deletedTransactionId });
      seenRestoreHashes.add(row.dedupHash);
      continue;
    }

    if (seenCreateHashes.has(row.dedupHash)) {
      duplicateCount += 1;
      continue;
    }

    rowsToCreate.push(row);
    seenCreateHashes.add(row.dedupHash);
  }

  return { rowsToCreate, rowsToRestore, duplicateCount };
}
