'use server';

import { commitImportAction } from '@/app/actions/commit-import';
import { getDb } from '@/lib/db';
import { downloadItemContent, listFolderItemsByPath } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';
import { detectStatementSource } from '@/lib/statement-source-detector';

export type SyncOneDriveRelevesResult = {
  ok: true;
  processedFiles: number;
  importedFiles: number;
  skippedFiles: number;
  details: string[];
  errors: { filename: string; reason: string }[];
};

const STATEMENTS_ROOT = '/Comptabilite/Releves';

function isPeriodFolder(name: string): boolean {
  return /^\d{4}-\d{2}$/.test(name);
}

function isCsv(name: string): boolean {
  return name.toLowerCase().endsWith('.csv');
}

function fileFromBuffer(buffer: Buffer, filename: string): File {
  return new File([new Uint8Array(buffer)], filename, { type: 'text/csv' });
}

export async function syncOneDriveRelevesAction(
  _prevState: SyncOneDriveRelevesResult | null,
  _formData: FormData,
): Promise<SyncOneDriveRelevesResult> {
  await requireOwner();

  const db = getDb();
  const details: string[] = [];
  const errors: { filename: string; reason: string }[] = [];
  let processedFiles = 0;
  let importedFiles = 0;
  let skippedFiles = 0;

  const folders = (await listFolderItemsByPath(STATEMENTS_ROOT)).filter((item) => isPeriodFolder(item.name));

  for (const folder of folders) {
    const files = (await listFolderItemsByPath(`${STATEMENTS_ROOT}/${folder.name}`)).filter((item) =>
      isCsv(item.name),
    );

    for (const file of files) {
      processedFiles += 1;

      try {
        const detection = await detectStatementSource(file.name);
        if (!detection.ok) {
          skippedFiles += 1;
          errors.push({ filename: file.name, reason: detection.reason });
          continue;
        }

        const existingImport = await db.bankStatementImport.findFirst({
          where: {
            filename: file.name,
            paymentSourceId: detection.paymentSourceId,
          },
          select: { id: true },
        });

        if (existingImport) {
          skippedFiles += 1;
          details.push(`${file.name}: déjà importé`);
          continue;
        }

        const contents = await downloadItemContent(file.id);
        const formData = new FormData();
        formData.set('paymentSourceId', detection.paymentSourceId);
        formData.set('file', fileFromBuffer(contents, file.name));

        const result = await commitImportAction(null, formData);
        if (!result.ok) {
          skippedFiles += 1;
          errors.push({ filename: file.name, reason: result.error });
          continue;
        }

        importedFiles += 1;
        details.push(`${file.name}: ${result.importedCount} transactions importées`);
      } catch (error) {
        skippedFiles += 1;
        errors.push({
          filename: file.name,
          reason: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }
  }

  return {
    ok: true,
    processedFiles,
    importedFiles,
    skippedFiles,
    details,
    errors,
  };
}
