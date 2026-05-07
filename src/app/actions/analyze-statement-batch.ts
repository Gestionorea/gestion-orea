'use server';

import { computeDedupHash } from '@/lib/dedup-hash';
import { getDb } from '@/lib/db';
import { partitionImportRowsByDedup } from '@/lib/import-dedup';
import { requireOwner } from '@/lib/permissions';
import { listPaymentSources } from '@/lib/paymentSources';
import { parseStatement } from '@/lib/statement-parser';
import { detectStatementSourceFromSources } from '@/lib/statement-source-detector';

export type FileAnalysisRow = {
  rowNumber: number;
  date: string;
  description: string;
  amountTotal: string;
  type: 'income' | 'expense';
  status: 'new' | 'duplicate' | 'restorable';
};

export type FileAnalysisResult = {
  filename: string;
  detectedPaymentSourceId: string | null;
  detectedPaymentSourceName: string | null;
  parsed: { rows: FileAnalysisRow[]; warnings: string[] } | null;
  parseError: string | null;
  detectionReason?: string;
};

export type BatchAnalysisResult =
  | { ok: true; files: FileAnalysisResult[] }
  | { ok: false; error: string };

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

export async function analyzeStatementBatchAction(formData: FormData): Promise<BatchAnalysisResult> {
  await requireOwner();

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { ok: false, error: 'Aucun fichier fourni' };
  }

  const sources = await listPaymentSources({ archived: false });
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  // Pre-compute all dedup hashes across all files for cross-file dedup + DB check
  type RowContext = {
    fileIndex: number;
    rowIndex: number;
    dedupHash: string;
  };
  const allHashContexts: RowContext[] = [];
  const parsedPerFile: Array<{
    rows: Awaited<ReturnType<typeof parseStatement>>['rows'];
    warnings: string[];
    parseError: string | null;
  }> = [];

  // Step 1: parse all files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const buffer = await fileToBuffer(file);
      const parsed = await parseStatement({ buffer, filename: file.name });
      parsedPerFile.push({
        rows: parsed.rows,
        warnings: parsed.warnings,
        parseError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur de lecture';
      parsedPerFile.push({ rows: [], warnings: [], parseError: msg });
    }
  }

  // Step 2: detect PaymentSource per file + compute dedup hashes (using detected or null fallback)
  const filesAnalysis: FileAnalysisResult[] = files.map((file, i) => {
    const detection = detectStatementSourceFromSources(file.name, sources);
    const detectedPaymentSourceId = detection.ok ? detection.paymentSourceId : null;
    const detectedPaymentSourceName = detectedPaymentSourceId
      ? sourceById.get(detectedPaymentSourceId)?.name ?? null
      : null;
    const detectionReason = !detection.ok ? detection.reason : undefined;

    return {
      filename: file.name,
      detectedPaymentSourceId,
      detectedPaymentSourceName,
      parsed: null, // filled in step 4
      parseError: parsedPerFile[i].parseError,
      detectionReason,
    };
  });

  // Step 3: collect dedup hashes for files with a detected paymentSource
  // (without paymentSource, dedup hash is meaningless — the proprio will pick one in the UI)
  for (let i = 0; i < files.length; i++) {
    const detected = filesAnalysis[i].detectedPaymentSourceId;
    if (!detected) continue;
    const parsed = parsedPerFile[i];
    parsed.rows.forEach((row, rowIndex) => {
      const hash = computeDedupHash({
        date: row.date,
        amountTotal: row.amountTotal,
        description: row.description,
        paymentSourceId: detected,
      });
      allHashContexts.push({ fileIndex: i, rowIndex, dedupHash: hash });
    });
  }

  // Step 4: bulk check existing hashes in DB
  const allHashes = allHashContexts.map((c) => c.dedupHash);
  const uniqueHashes = [...new Set(allHashes)];
  const existing = uniqueHashes.length > 0
    ? await getDb().transaction.findMany({
        where: { dedupHash: { in: uniqueHashes } },
        select: { id: true, dedupHash: true, deletedAt: true },
      })
    : [];
  const partition = partitionImportRowsByDedup(
    allHashContexts.map((context) => ({
      row: context,
      dedupHash: context.dedupHash,
    })),
    existing,
  );
  const createKeys = new Set(partition.rowsToCreate.map(({ row }) => `${row.fileIndex}:${row.rowIndex}`));
  const restoreKeys = new Set(partition.rowsToRestore.map(({ row }) => `${row.fileIndex}:${row.rowIndex}`));

  // Step 5: cross-file dedup (first occurrence wins)
  const statusByContext = new Map<string, 'new' | 'duplicate' | 'restorable'>();
  for (const ctx of allHashContexts) {
    const key = `${ctx.fileIndex}:${ctx.rowIndex}`;
    if (createKeys.has(key)) {
      statusByContext.set(key, 'new');
    } else if (restoreKeys.has(key)) {
      statusByContext.set(key, 'restorable');
    } else {
      statusByContext.set(key, 'duplicate');
    }
  }

  // Step 6: assemble final results
  for (let i = 0; i < files.length; i++) {
    const parsed = parsedPerFile[i];
    if (parsed.parseError) {
      filesAnalysis[i].parsed = null;
      continue;
    }
    const hasDetection = !!filesAnalysis[i].detectedPaymentSourceId;
    const rows: FileAnalysisRow[] = parsed.rows.map((row, rowIndex) => {
      const key = `${i}:${rowIndex}`;
      const status: 'new' | 'duplicate' | 'restorable' = hasDetection
        ? statusByContext.get(key) ?? 'new'
        : 'new'; // we cannot dedup without payment source — proprio will see status as 'new'
      return {
        rowNumber: row.rawRowNumber,
        date: row.date.toISOString().slice(0, 10),
        description: row.description,
        amountTotal: row.amountTotal.toFixed(2),
        type: row.type,
        status,
      };
    });
    filesAnalysis[i].parsed = { rows, warnings: parsed.warnings };
  }

  return { ok: true, files: filesAnalysis };
}
