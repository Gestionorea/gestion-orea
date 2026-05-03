'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { deleteTransactionAction, toggleReconciledAction } from '@/app/actions/transactions';
import type { TransactionRow as TransactionRowData, TransactionVisualStatus } from '@/lib/transactions';

export type TransactionRowLabels = {
  type: string;
  advanceBadge: string;
  advanceReimbursed: string;
  reconciledMark: string;
  reconciledUnmark: string;
  reconciledNo: string;
  reconciledTitle: string;
  delete: string;
  readOnly: string;
};

function visualRowClass(status: TransactionVisualStatus): string {
  if (status === 'invoice_ok') return 'bg-green-50 hover:bg-green-100';
  if (status === 'missing_invoice') return 'bg-red-50 hover:bg-red-100';
  if (status === 'recurring_ok') return 'bg-yellow-50 hover:bg-yellow-100';
  return 'bg-white hover:bg-gray-50';
}

function visualBadgeClass(status: TransactionVisualStatus): string {
  if (status === 'invoice_ok') return 'bg-green-500';
  if (status === 'missing_invoice') return 'bg-red-500';
  if (status === 'recurring_ok') return 'bg-yellow-500';
  if (status === 'income') return 'bg-blue-400';
  return '';
}

function visualStatusKey(status: TransactionVisualStatus): 'invoiceOk' | 'missingInvoice' | 'recurringOk' | 'income' | null {
  if (status === 'invoice_ok') return 'invoiceOk';
  if (status === 'missing_invoice') return 'missingInvoice';
  if (status === 'recurring_ok') return 'recurringOk';
  if (status === 'income') return 'income';
  return null;
}

export default function TransactionRow({
  row,
  locale,
  href,
  merchantHref,
  canMutate,
  canReconcile,
  canDelete = false,
  selected = false,
  onToggleSelected,
  labels,
}: {
  row: TransactionRowData;
  locale: string;
  href: string;
  merchantHref: string;
  canMutate: boolean;
  canReconcile: boolean;
  canDelete?: boolean;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
  labels: TransactionRowLabels;
}) {
  const t = useTranslations('perso.compta');
  const router = useRouter();
  const goToDetail = () => router.push(href);
  const visualKey = visualStatusKey(row.visualStatus);
  const visualLabel = visualKey ? t(`visualStatus.${visualKey}`) : null;
  const stopRowNavigation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <tr
      className={`cursor-pointer transition ${visualRowClass(row.visualStatus)}`}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goToDetail();
        }
      }}
      tabIndex={0}
    >
      {canDelete ? (
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected?.(row.id)}
            onClick={stopRowNavigation}
            className="h-4 w-4 border-gray-300"
            aria-label={row.merchantName}
          />
        </td>
      ) : null}
      <td className="px-4 py-4 text-gray-600">
        <div className="flex items-center gap-3">
          {visualLabel ? (
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${visualBadgeClass(row.visualStatus)}`}
              title={visualLabel}
              aria-label={visualLabel}
            />
          ) : null}
          <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(row.date)}</span>
        </div>
      </td>
      <td className="px-4 py-4 font-medium text-black">
        <Link href={merchantHref} className="hover:underline" onClick={stopRowNavigation}>
          {row.merchantName}
        </Link>
      </td>
      <td className="px-4 py-4 text-gray-600">{labels.type}</td>
      <td className="px-4 py-4 text-gray-600">
        <div className="flex flex-col gap-1">
          <span>${row.amountTotal}</span>
          {row.taxRegime === 'taxable_qc' ? null : (
            <span className="text-xs text-gray-500">{t(`taxRegime.${row.taxRegime}`)}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-gray-600">{row.category?.name ?? '-'}</td>
      <td className="px-4 py-4 text-gray-600">
        <div className="flex flex-col gap-2">
          <span>
            {row.paymentSource
              ? `${row.paymentSource.name}${row.paymentSource.lastDigits ? ` ····${row.paymentSource.lastDigits}` : ''}`
              : '-'}
          </span>
          {row.isAdvance && !row.reimbursedAt ? (
            <span className="w-fit rounded bg-yellow-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-800">
              {labels.advanceBadge}
            </span>
          ) : null}
          {row.isAdvance && row.reimbursedAt ? (
            <span className="w-fit rounded bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600">
              {labels.advanceReimbursed}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-4 text-gray-600">{row.property?.name ?? '-'}</td>
      <td className="px-4 py-4 text-gray-600">{row.company?.name ?? '-'}</td>
      <td className="px-4 py-4 text-gray-600">
        {canReconcile ? (
          <form action={toggleReconciledAction} className="flex items-center gap-2" onClick={stopRowNavigation}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="reconciled" value={row.reconciledAt ? 'false' : 'true'} />
            <button
              type="submit"
              className="inline-flex h-5 w-5 items-center justify-center border border-gray-300 hover:border-black"
              aria-label={row.reconciledAt ? labels.reconciledUnmark : labels.reconciledMark}
              title={row.reconciledAt ? labels.reconciledTitle : labels.reconciledMark}
            >
              {row.reconciledAt ? '✓' : ''}
            </button>
          </form>
        ) : row.reconciledAt ? (
          <span title={labels.reconciledTitle}>✓</span>
        ) : (
          <span className="text-gray-400">{labels.reconciledNo}</span>
        )}
      </td>
      <td className="px-4 py-4">
        {canMutate ? (
          <form action={deleteTransactionAction} onClick={stopRowNavigation}>
            <input type="hidden" name="id" value={row.id} />
            <button className="text-red-700 hover:text-red-900">{labels.delete}</button>
          </form>
        ) : (
          <span className="text-gray-400">{labels.readOnly}</span>
        )}
      </td>
    </tr>
  );
}
