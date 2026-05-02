'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { deleteTransactionAction, toggleReconciledAction } from '@/app/actions/transactions';
import type { TransactionRow as TransactionRowData } from '@/lib/transactions';

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

export default function TransactionRow({
  row,
  locale,
  href,
  merchantHref,
  canMutate,
  canReconcile,
  labels,
}: {
  row: TransactionRowData;
  locale: string;
  href: string;
  merchantHref: string;
  canMutate: boolean;
  canReconcile: boolean;
  labels: TransactionRowLabels;
}) {
  const t = useTranslations('perso.compta');
  const router = useRouter();
  const goToDetail = () => router.push(href);
  const stopRowNavigation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <tr
      className="cursor-pointer transition hover:bg-gray-50"
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goToDetail();
        }
      }}
      tabIndex={0}
    >
      <td className="px-4 py-4 text-gray-600">
        {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(row.date)}
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
