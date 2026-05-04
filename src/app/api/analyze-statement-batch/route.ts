import { NextRequest, NextResponse } from 'next/server';
import { computeDedupHash } from '@/lib/dedup-hash';
import { getDb } from '@/lib/db';
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
        select: { dedupHash: true },
      })
    : [];
  const existingHashSet = new Set(existing.map((row) => row.dedupHash).filter((hash): hash is string => hash !== null));

  const seenInBatch = new Set<string>();
  const statusByContext = new Map<string, 'new' | 'duplicate'>();
  for (const context of allHashContexts) {
    const key = `${context.fileIndex}:${context.rowIndex}`;
    if (existingHashSet.has(context.dedupHash)) {
      statusByContext.set(key, 'duplicate');
    } else if (seenInBatch.has(context.dedupHash)) {
      statusByContext.set(key, 'duplicate');
    } else {
      seenInBatch.add(context.dedupHash);
      statusByContext.set(key, 'new');
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
      const status: 'new' | 'duplicate' = hasDetection
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
