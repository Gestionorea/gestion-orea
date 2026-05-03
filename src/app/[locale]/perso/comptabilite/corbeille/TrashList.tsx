'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  hardDeleteFromTrashAction,
  restoreTransactionsAction,
  type TrashActionResult,
} from '@/app/actions/restore-transactions';
import ConfirmDeleteModal from '../ConfirmDeleteModal';

export type TrashedTransactionRow = {
  id: string;
  date: Date;
  merchantName: string;
  amountTotal: string;
  type: 'income' | 'expense';
  deletedAt: Date | null;
  deletedBy: string | null;
  paymentSource: { name: string; lastDigits: string | null } | null;
  category: { name: string } | null;
};

function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function sourceLabel(source: TrashedTransactionRow['paymentSource']): string {
  if (!source) return '-';
  return `${source.name}${source.lastDigits ? ` ····${source.lastDigits}` : ''}`;
}

function amountClass(type: TrashedTransactionRow['type']): string {
  return type === 'income' ? 'font-medium text-green-700' : 'text-gray-900';
}

export default function TrashList({
  rows,
  locale,
}: {
  rows: TrashedTransactionRow[];
  locale: string;
}) {
  const t = useTranslations('perso.compta.trash');
  const commonT = useTranslations('perso.compta');
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => rowIds.has(id)),
    [rowIds, selectedIds],
  );
  const allSelected = rows.length > 0 && rows.every((row) => validSelectedIds.includes(row.id));

  function formDataFor(ids: string[], confirmation?: string) {
    const formData = new FormData();
    formData.set('transactionIds', JSON.stringify(ids));
    if (confirmation) formData.set('confirmation', confirmation);
    return formData;
  }

  function applyResult(result: TrashActionResult, successMessage: (count: number) => string) {
    if (!result.ok) {
      setError(result.error);
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(successMessage(result.count));
    setSelectedIds([]);
    router.refresh();
  }

  function restore(ids: string[]) {
    startTransition(async () => {
      const result = await restoreTransactionsAction(formDataFor(ids));
      applyResult(result, (count) => t('restoreSuccess', { count }));
    });
  }

  function hardDelete(ids: string[]) {
    startTransition(async () => {
      const result = await hardDeleteFromTrashAction(formDataFor(ids, 'SUPPRIMER'));
      applyResult(result, (count) => t('hardDeleteSuccess', { count }));
      setPendingDeleteIds([]);
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(rows.map((row) => row.id));
  }

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (rows.length === 0) {
    return <p className="mt-8 border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">{t('empty')}</p>;
  }

  return (
    <div className="mt-8 grid gap-4">
      {message ? <div className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div> : null}
      {error ? <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">{t('selectedCount', { count: validSelectedIds.length })}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => restore(validSelectedIds)}
            disabled={validSelectedIds.length === 0 || isPending}
            className="bg-green-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {t('restoreCount', { count: validSelectedIds.length })}
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteIds(validSelectedIds)}
            disabled={validSelectedIds.length === 0 || isPending}
            className="border border-red-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {t('hardDeleteCount', { count: validSelectedIds.length })}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.14em] text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex h-5 w-5 items-center justify-center border border-gray-300 hover:border-black"
                  aria-label={t('selectAll')}
                  title={t('selectAll')}
                >
                  {allSelected ? '✓' : ''}
                </button>
              </th>
              <th className="px-3 py-3 font-medium">{commonT('columns.date')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.merchant')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.total')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.type')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.paymentSource')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.category')}</th>
              <th className="px-3 py-3 font-medium">{t('deletedAt')}</th>
              <th className="px-3 py-3 font-medium">{t('deletedBy')}</th>
              <th className="px-3 py-3 font-medium">{commonT('columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white">
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
                <td className="min-w-56 px-3 py-3 font-medium text-black">{row.merchantName}</td>
                <td className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${amountClass(row.type)}`}>
                  ${row.amountTotal}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{commonT(`types.${row.type}`)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{sourceLabel(row.paymentSource)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{row.category?.name ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDate(row.deletedAt, locale)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">{row.deletedBy ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => restore([row.id])}
                      disabled={isPending}
                      className="text-green-700 hover:text-green-900 disabled:text-gray-400"
                    >
                      {t('restore')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteIds([row.id])}
                      disabled={isPending}
                      className="text-red-700 hover:text-red-900 disabled:text-gray-400"
                    >
                      {t('hardDelete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteIds.length > 0}
        title={t('hardDelete')}
        description={t('hardDeleteDescription')}
        expectedCount={pendingDeleteIds.length}
        pending={isPending}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={() => hardDelete(pendingDeleteIds)}
      />
    </div>
  );
}
