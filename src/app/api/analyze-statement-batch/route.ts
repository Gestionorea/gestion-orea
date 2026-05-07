import { NextRequest, NextResponse } from 'next/server';
import { computeDedupHash } from '@/lib/dedup-hash';
import { getDb } from '@/lib/db';
import { partitionImportRowsByDedup } from '@/lib/import-dedup';
import { parseMultipartRequest } from '@/lib/multipart-upload';
import { requireOwner } from '@/lib/permissions';
import { listPaymentSources } from '@/lib/paymentSources';
import { parseStatement } from '@/lib/statement-parser';
import { detectStatementSourceFromSources } from '@/lib/statement-source-detector';
import type { BatchAnalysisResult, FileAnalysisResult, FileAnalysisRow } from '@/app/actions/analyze-statement-batch';

export async function POST(request: NextRequest): Promise<NextResponse<BatchAnalysisResult>> {
  await requireOwner();

  let multipart: Awaited<ReturnType<typeof parseMultipartRequest>>;
  try {
    multipart = await parseMultipartRequest(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Lecture du formulaire impossible' }, { status: 400 });
  }

  const files = multipart.files.filter((file) => file.fieldName === 'files' && file.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: 'Aucun fichier fourni' }, { status: 400 });
  }

  const sources = await listPaymentSources({ archived: false });
  const sourceById = new Map(sources.map((source) => [source.id, source]));

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

  for (const file of files) {
    try {
      const parsed = await parseStatement({ buffer: file.buffer, filename: file.filename });
      parsedPerFile.push({
        rows: parsed.rows,
        warnings: parsed.warnings,
        parseError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de lecture';
      parsedPerFile.push({ rows: [], warnings: [], parseError: message });
    }
  }

  const filesAnalysis: FileAnalysisResult[] = files.map((file, index) => {
    const detection = detectStatementSourceFromSources(file.filename, sources);
    const detectedPaymentSourceId = detection.ok ? detection.paymentSourceId : null;
    const detectedPaymentSourceName = detectedPaymentSourceId
      ? sourceById.get(detectedPaymentSourceId)?.name ?? null
      : null;
    const detectionReason = !detection.ok ? detection.reason : undefined;

    return {
      filename: file.filename,
      detectedPaymentSourceId,
      detectedPaymentSourceName,
      parsed: null,
      parseError: parsedPerFile[index].parseError,
      detectionReason,
    };
  });

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const detectedPaymentSourceId = filesAnalysis[fileIndex].detectedPaymentSourceId;
    if (!detectedPaymentSourceId) continue;

    parsedPerFile[fileIndex].rows.forEach((row, rowIndex) => {
      const dedupHash = computeDedupHash({
        date: row.date,
        amountTotal: row.amountTotal,
        description: row.description,
        paymentSourceId: detectedPaymentSourceId,
      });
      allHashContexts.push({ fileIndex, rowIndex, dedupHash });
    });
  }

  const uniqueHashes = [...new Set(allHashContexts.map((context) => context.dedupHash))];
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

  const statusByContext = new Map<string, 'new' | 'duplicate' | 'restorable'>();
  for (const context of allHashContexts) {
    const key = `${context.fileIndex}:${context.rowIndex}`;
    if (createKeys.has(key)) {
      statusByContext.set(key, 'new');
    } else if (restoreKeys.has(key)) {
      statusByContext.set(key, 'restorable');
    } else {
      statusByContext.set(key, 'duplicate');
    }
  }

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const parsed = parsedPerFile[fileIndex];
    if (parsed.parseError) {
      filesAnalysis[fileIndex].parsed = null;
      continue;
    }

    const hasDetection = !!filesAnalysis[fileIndex].detectedPaymentSourceId;
    const rows: FileAnalysisRow[] = parsed.rows.map((row, rowIndex) => {
      const key = `${fileIndex}:${rowIndex}`;
      const status: 'new' | 'duplicate' | 'restorable' = hasDetection
        ? statusByContext.get(key) ?? 'new'
        : 'new';

      return {
        rowNumber: row.rawRowNumber,
        date: row.date.toISOString().slice(0, 10),
        description: row.description,
        amountTotal: row.amountTotal.toFixed(2),
        type: row.type,
        status,
      };
    });

    filesAnalysis[fileIndex].parsed = { rows, warnings: parsed.warnings };
  }

  return NextResponse.json({ ok: true, files: filesAnalysis });
}
