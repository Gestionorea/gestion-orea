'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';
import type { BatchAnalysisResult, FileAnalysisResult } from '@/app/actions/analyze-statement-batch';
import type { PaymentSourceItem } from '@/lib/paymentSources';

type CommitStatus =
  | { state: 'pending' }
  | {
      state: 'success';
      period: { year: number; month: number };
      importedCount: number;
      restoredCount?: number;
      duplicateCount: number;
    }
  | { state: 'error'; error: string };

type UploadStatementResult =
  | {
      ok: true;
      period: { year: number; month: number };
      importedCount: number;
      restoredCount?: number;
      duplicateCount: number;
    }
  | { ok: false; error: string };

function paymentSourceLabel(source: PaymentSourceItem): string {
  return source.lastDigits ? `${source.name} • ${source.lastDigits}` : source.name;
}

function normalizeFilename(filename: string): string {
  return filename.normalize('NFC');
}

function transactionsHref(
  locale: string,
  commitResults: Record<string, CommitStatus>,
): string | { pathname: string; query: Record<string, string> } {
  const periods = Object.values(commitResults).flatMap((result) =>
    result.state === 'success' ? [result.period] : [],
  );
  const basePath = `/${locale}/perso/comptabilite`;
  if (periods.length === 0) return basePath;

  const years = new Set(periods.map((period) => period.year));
  const months = new Set(periods.map((period) => period.month));
  if (years.size === 1 && months.size === 1) {
    const [period] = periods;
    return {
      pathname: basePath,
      query: { year: String(period.year), month: String(period.month) },
    };
  }
  if (years.size === 1) {
    return {
      pathname: basePath,
      query: { year: String(periods[0].year), month: 'all' },
    };
  }

  return basePath;
}

export default function MultiUploadForm({
  paymentSources,
}: {
  paymentSources: PaymentSourceItem[];
}) {
  const t = useTranslations('perso.importStatement');
  const locale = useLocale();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<FileAnalysisResult[]>([]);
  const [paymentSourceOverrides, setPaymentSourceOverrides] = useState<Record<string, string>>({});
  const [commitResults, setCommitResults] = useState<Record<string, CommitStatus>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyze] = useTransition();
  const [isCommitting, startCommit] = useTransition();

  const handleFilesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setAnalysisResults([]);
    setPaymentSourceOverrides({});
    setCommitResults({});
    setGlobalError(null);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedFiles.length === 0) return;
    setGlobalError(null);
    setCommitResults({});

    startAnalyze(async () => {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append('files', file);
      }
      const response = await fetch('/api/analyze-statement-batch', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as BatchAnalysisResult;
      if (!result.ok) {
        setGlobalError(result.error);
        setAnalysisResults([]);
        return;
      }
      setAnalysisResults(result.files);
      // Reset overrides for new batch
      setPaymentSourceOverrides({});
    });
  }, [selectedFiles]);

  const resolvePaymentSourceId = useCallback(
    (filename: string): string | null => {
      const key = normalizeFilename(filename);
      const result = analysisResults.find((a) => normalizeFilename(a.filename) === key);
      if (result?.detectedPaymentSourceId) return result.detectedPaymentSourceId;
      return paymentSourceOverrides[key] ?? null;
    },
    [analysisResults, paymentSourceOverrides],
  );

  const allResolved =
    analysisResults.length > 0 &&
    analysisResults
      .filter((a) => a.parsed && a.parsed.rows.length > 0)
      .every((a) => resolvePaymentSourceId(a.filename) !== null);

  const totalNew = analysisResults.reduce(
    (sum, a) => sum + (a.parsed?.rows.filter((r) => r.status !== 'duplicate').length ?? 0),
    0,
  );

  const handleCommitAll = useCallback(() => {
    if (selectedFiles.length === 0) return;

    startCommit(async () => {
      const newResults: Record<string, CommitStatus> = {};
      for (const file of selectedFiles) {
        const fileKey = normalizeFilename(file.name);
        const paymentSourceId = resolvePaymentSourceId(file.name);
        if (!paymentSourceId) {
          continue; // skip unresolved
        }
        newResults[fileKey] = { state: 'pending' };
        setCommitResults({ ...newResults });

        const fd = new FormData();
        fd.append('paymentSourceId', paymentSourceId);
        fd.append('file', file);
        fd.append('categoryOverrides', '{}');

        try {
          const response = await fetch('/api/upload-statement', {
            method: 'POST',
            body: fd,
          });
          const result = (await response.json()) as UploadStatementResult;
          if (result.ok) {
            newResults[fileKey] = {
              state: 'success',
              period: result.period,
              importedCount: result.importedCount,
              restoredCount: result.restoredCount,
              duplicateCount: result.duplicateCount,
            };
          } else {
            newResults[fileKey] = { state: 'error', error: result.error };
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Erreur inconnue';
          newResults[fileKey] = { state: 'error', error: msg };
        }
        setCommitResults({ ...newResults });
      }
    });
  }, [selectedFiles, resolvePaymentSourceId]);

  const successCount = Object.values(commitResults).filter((r) => r.state === 'success').length;
  const errorCount = Object.values(commitResults).filter((r) => r.state === 'error').length;
  const allCommitted = analysisResults.length > 0 && successCount + errorCount >= analysisResults.length;

  return (
    <div className="grid gap-5">
      <p className="text-sm text-gray-700">{t('multiUpload.instructions')}</p>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-black">{t('multiUpload.selectFiles')}</span>
        <input
          type="file"
          multiple
          accept=".csv,.pdf,.xlsx,.xls"
          onChange={handleFilesChange}
          className="border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {selectedFiles.length > 0 && analysisResults.length === 0 ? (
        <div className="text-sm text-gray-600">
          {t('multiUpload.filesSelected', { count: selectedFiles.length })}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={selectedFiles.length === 0 || isAnalyzing}
          className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isAnalyzing ? t('multiUpload.analyzing') : t('multiUpload.analyzeAll')}
        </button>
      </div>

      {globalError ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}

      {analysisResults.length > 0 ? (
        <div className="grid gap-4">
          <h2 className="font-serif text-xl tracking-[0.06em] text-black">
            {t('multiUpload.batchPreview', { count: analysisResults.length, newRows: totalNew })}
          </h2>

          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.12em] text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('multiUpload.fileColumn.filename')}</th>
                  <th className="px-3 py-2 font-medium">{t('multiUpload.fileColumn.paymentSource')}</th>
                  <th className="px-3 py-2 font-medium">{t('multiUpload.fileColumn.status')}</th>
                  <th className="px-3 py-2 font-medium">{t('multiUpload.fileColumn.commit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analysisResults.map((file) => {
                  const resolvedId = resolvePaymentSourceId(file.filename);
                  const isDetected = !!file.detectedPaymentSourceId;
                  const newRows = file.parsed?.rows.filter((r) => r.status !== 'duplicate').length ?? 0;
                  const dupRows = file.parsed?.rows.filter((r) => r.status === 'duplicate').length ?? 0;
                  const commit = commitResults[normalizeFilename(file.filename)];

                  return (
                    <tr key={file.filename} className="bg-white">
                      <td className="px-3 py-3 align-top font-mono text-xs">{file.filename}</td>
                      <td className="px-3 py-3 align-top">
                        {isDetected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <span aria-hidden="true">✓</span>
                            {file.detectedPaymentSourceName ?? '?'}
                          </span>
                        ) : (
                          <select
                            value={paymentSourceOverrides[normalizeFilename(file.filename)] ?? ''}
                            onChange={(event) =>
                              setPaymentSourceOverrides((prev) => ({
                                ...prev,
                                [normalizeFilename(file.filename)]: event.target.value,
                              }))
                            }
                            className="border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="" disabled>
                              {t('multiUpload.status.notDetected')}
                            </option>
                            {paymentSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {paymentSourceLabel(source)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs">
                        {file.parseError ? (
                          <span className="text-red-700">
                            {t('multiUpload.status.parseError')}: {file.parseError}
                          </span>
                        ) : (
                          <span className="text-gray-700">
                            {t('multiUpload.status.newRows', { count: newRows })} ·{' '}
                            {t('multiUpload.status.duplicates', { count: dupRows })}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs">
                        {!commit ? (
                          resolvedId ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <span className="text-yellow-700">⚠ Source manquante</span>
                          )
                        ) : commit.state === 'pending' ? (
                          <span className="text-gray-500">…</span>
                        ) : commit.state === 'success' ? (
                          <span className="text-green-700">
                            ✓ {t('multiUpload.status.success', { count: commit.importedCount })}
                          </span>
                        ) : (
                          <span className="text-red-700">
                            ✗ {t('multiUpload.status.error', { error: commit.error })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!allCommitted ? (
            <div>
              <button
                type="button"
                onClick={handleCommitAll}
                disabled={!allResolved || isCommitting || totalNew === 0}
                className="border border-black bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400"
              >
                {isCommitting
                  ? t('multiUpload.committing')
                  : t('multiUpload.commitAll', { count: totalNew })}
              </button>
              {!allResolved ? (
                <p className="mt-2 text-xs text-yellow-700">
                  {t('multiUpload.resolveFirst')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-medium">
                {t('multiUpload.allDone', { success: successCount, error: errorCount })}
              </p>
              <Link
                href={transactionsHref(locale, commitResults)}
                className="mt-3 inline-flex border border-green-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-green-900 hover:bg-green-100"
              >
                {t('commit.viewTransactions')}
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
