'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useCallback, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  analyzeStatementAction,
  type AnalyzeStatementResult,
} from '@/app/actions/analyze-statement';
import { commitImportAction, type CommitImportResult } from '@/app/actions/commit-import';
import type { PaymentSourceItem } from '@/lib/paymentSources';
import PreviewTable from './PreviewTable';
import SyncButtons from './SyncButtons';

function SubmitButton() {
  const t = useTranslations('perso.importStatement.form');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

function CommitButton({
  count,
  pending,
  onCommit,
}: {
  count: number;
  pending: boolean;
  onCommit: () => void;
}) {
  const t = useTranslations('perso.importStatement.commit');

  return (
    <button
      type="button"
      onClick={onCommit}
      disabled={pending || count === 0}
      className="border border-black bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400"
    >
      {pending ? t('submitting') : t('submit', { count })}
    </button>
  );
}

function paymentSourceLabel(source: PaymentSourceItem): string {
  return source.lastDigits ? `${source.name} • ${source.lastDigits}` : source.name;
}

export default function UploadForm({
  paymentSources,
}: {
  paymentSources: PaymentSourceItem[];
}) {
  const t = useTranslations('perso.importStatement');
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string | null>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPaymentSourceId, setSelectedPaymentSourceId] = useState('');
  const [commitState, setCommitState] = useState<CommitImportResult | null>(null);
  const [isCommitPending, startCommitTransition] = useTransition();
  const [analyzeState, analyzeFormAction] = useActionState<AnalyzeStatementResult | null, FormData>(
    analyzeStatementAction,
    null,
  );
  const newRowsCount = analyzeState?.ok
    ? analyzeState.preview.filter((row) => row.status === 'new').length
    : 0;

  const handleCategoryOverridesChange = useCallback((overrides: Record<number, string | null>) => {
    setCategoryOverrides(overrides);
  }, []);

  const handleCommit = useCallback(() => {
    if (!selectedFile || !selectedPaymentSourceId) {
      setCommitState({ ok: false, error: "Veuillez re-selectionner le fichier pour finaliser l'import." });
      return;
    }

    startCommitTransition(async () => {
      const formData = new FormData();
      formData.append('paymentSourceId', selectedPaymentSourceId);
      formData.append('file', selectedFile);
      formData.append('categoryOverrides', JSON.stringify(categoryOverrides));

      const result = await commitImportAction(null, formData);
      setCommitState(result);

      if (result.ok) {
        formRef.current?.reset();
        setSelectedFile(null);
        setSelectedPaymentSourceId('');
        setCategoryOverrides({});
      }
    });
  }, [categoryOverrides, selectedFile, selectedPaymentSourceId]);

  return (
    <div className="mt-8 grid max-w-3xl gap-6">
      <SyncButtons />

      <form ref={formRef} action={analyzeFormAction} className="grid gap-5">
        <input type="hidden" name="categoryOverrides" value={JSON.stringify(categoryOverrides)} />

        {analyzeState?.ok === false ? (
          <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {analyzeState.error}
          </div>
        ) : null}

        {commitState?.ok === false ? (
          <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">{t('commit.errorTitle')}</p>
            <p className="mt-1">{commitState.error}</p>
          </div>
        ) : null}

        {commitState?.ok === true ? (
          <div className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
            <p className="font-medium">{t('commit.successTitle')}</p>
            <p className="mt-1">
              {commitState.categorizedCount > 0
                ? t('commit.successDetailWithCategories', {
                    imported: commitState.importedCount,
                    categorized: commitState.categorizedCount,
                    duplicates: commitState.duplicateCount,
                  })
                : t('commit.successDetail', {
                    imported: commitState.importedCount,
                    duplicates: commitState.duplicateCount,
                  })}
            </p>
            <Link
              href={`/${locale}/perso/comptabilite`}
              className="mt-3 inline-flex border border-green-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-green-900 hover:bg-green-100"
            >
              {t('commit.viewTransactions')}
            </Link>
          </div>
        ) : null}

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('form.paymentSource')}</span>
          <select
            name="paymentSourceId"
            required
            value={selectedPaymentSourceId}
            onChange={(event) => {
              setSelectedPaymentSourceId(event.target.value);
              setCommitState(null);
            }}
            className="border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>{t('form.paymentSourcePlaceholder')}</option>
            {paymentSources.map((source) => (
              <option key={source.id} value={source.id}>
                {paymentSourceLabel(source)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('form.file')}</span>
          <input
            name="file"
            type="file"
            required
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setCommitState(null);
            }}
            className="border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div>
          <SubmitButton />
        </div>

        {analyzeState?.ok === true && commitState?.ok !== true ? (
          <div className="grid gap-4">
            {!selectedFile ? (
              <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                Veuillez re-selectionner le fichier pour finaliser l'import.
              </div>
            ) : null}
            <div>
              <h2 className="font-serif text-xl tracking-[0.06em] text-black">{t('preview.title')}</h2>
            </div>
            <PreviewTable
              rows={analyzeState.preview}
              warnings={analyzeState.warnings}
              categories={analyzeState.categories}
              onCategoryOverridesChange={handleCategoryOverridesChange}
            />
            {newRowsCount === 0 ? (
              <div className="border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {t('commit.noNewRows')}
              </div>
            ) : null}
            <div>
              <CommitButton count={newRowsCount} pending={isCommitPending} onCommit={handleCommit} />
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
