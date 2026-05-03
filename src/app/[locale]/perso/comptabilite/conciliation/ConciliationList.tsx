'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { bulkReconcileAction, type BulkReconcileResult } from '@/app/actions/bulk-reconcile';
import {
  exportTransactionsXlsxAction,
  type ExportTransactionsXlsxFilters,
} from '@/app/actions/export-transactions-xlsx';
import type { TransactionRow } from '@/lib/transactions';

type ReconcileFilter = 'all' | 'unreconciled' | 'reconciled';

function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function amountClass(type: TransactionRow['type']): string {
  return type === 'income' ? 'text-green-700' : 'text-gray-900';
}

function base64ToBlob(base64: string): Blob {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function ExportXlsxButton({
  filters,
  className,
}: {
  filters: ExportTransactionsXlsxFilters;
  className?: string;
}) {
  const t = useTranslations('perso.reconciliation');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await exportTransactionsXlsxAction(filters);
            if (!result.ok) {
              setError(result.error);
              return;
            }

            const url = URL.createObjectURL(base64ToBlob(result.xlsxBase64));
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          });
        }}
        className={
          className ??
          'border border-gray-300 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-black hover:border-black disabled:cursor-not-allowed disabled:text-gray-400'
        }
      >
        {isPending ? t('exporting') : t('exportXlsx')}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export default function ConciliationList({
  rows,
  locale,
}: {
  rows: TransactionRow[];
  locale: string;
}) {
  const t = useTranslations('perso.reconciliation');
  const router = useRouter();
  const [filter, setFilter] = useState<ReconcileFilter>('unreconciled');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, formAction] = useActionState<BulkReconcileResult | null, FormData>(
    bulkReconcileAction,
    null,
  );
  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => rowIds.has(id)),
    [rowIds, selectedIds],
  );

  const filteredRows = useMemo(() => {
    const sorted = [...rows].sort((left, right) => {
      if (Boolean(left.reconciledAt) === Boolean(right.reconciledAt)) {
        return right.date.getTime() - left.date.getTime();
      }
      return left.reconciledAt ? 1 : -1;
    });

    if (filter === 'reconciled') return sorted.filter((row) => row.reconciledAt);
    if (filter === 'unreconciled') return sorted.filter((row) => !row.reconciledAt);
    return sorted;
  }, [filter, rows]);

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => validSelectedIds.includes(row.id));

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [router, state]);

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredRows.some((row) => row.id === id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredRows.map((row) => row.id)])));
  }

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'unreconciled', 'reconciled'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={[
                'border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em]',
                filter === item ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-600 hover:border-black',
              ].join(' ')}
            >
              {item === 'all'
                ? t('filterAll')
                : item === 'reconciled'
                  ? t('filterReconciled')
                  : t('filterUnreconciled')}
            </button>
          ))}
        </div>

        <form action={formAction} className="flex flex-wrap gap-2" onSubmit={() => setSelectedIds([])}>
          <input type="hidden" name="transactionIds" value={JSON.stringify(validSelectedIds)} />
          <button
            type="submit"
            name="reconciled"
            value="true"
            disabled={validSelectedIds.length === 0}
            className="bg-black px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {t('bulkReconcile', { count: validSelectedIds.length })}
          </button>
          <button
            type="submit"
            name="reconciled"
            value="false"
            disabled={validSelectedIds.length === 0}
            className="border border-gray-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-black hover:border-black disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {t('bulkUnreconcile', { count: validSelectedIds.length })}
          </button>
        </form>
      </div>

      {state?.ok === false ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>
      ) : null}

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.14em] text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="inline-flex h-5 w-5 items-center justify-center border border-gray-300 hover:border-black"
                  aria-label={t('selectAll')}
                  title={t('selectAll')}
                >
                  {allVisibleSelected ? '✓' : ''}
                </button>
              </th>
              <th className="px-3 py-3 font-medium">{t('columns.date')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.merchant')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.total')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.category')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.company')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.source')}</th>
              <th className="px-3 py-3 font-medium">{t('columns.reconciled')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRows.map((row) => (
              <tr key={row.id} className={row.reconciledAt ? 'bg-white' : 'bg-blue-50'}>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleRow(row.id)}
                    className="inline-flex h-5 w-5 items-center justify-center border border-gray-300 bg-white hover:border-black"
                    aria-label={row.merchantName}
                  >
                    {validSelectedIds.includes(row.id) ? '✓' : ''}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDate(row.date, locale)}</td>
                <td className="min-w-56 px-3 py-3 font-medium text-black">
                  <div className="grid gap-1">
                    <span>{row.merchantName}</span>
                    {row.justification ? <span className="text-xs font-normal text-gray-500">{row.justification}</span> : null}
                  </div>
                </td>
                <td className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${amountClass(row.type)}`}>
                  ${row.amountTotal}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{row.category?.name ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{row.company?.name ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{row.paymentSource?.name ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {row.reconciledAt ? formatDate(row.reconciledAt, locale) : t('notReconciled')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
