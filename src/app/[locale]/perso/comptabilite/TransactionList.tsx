import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { deleteTransactionAction } from '@/app/actions/transactions';
import type { TransactionRow } from '@/lib/transactions';

export default async function TransactionList({
  rows,
  locale,
  canMutate,
}: {
  rows: TransactionRow[];
  locale: string;
  canMutate: boolean;
}) {
  const t = await getTranslations('perso.compta');

  return (
    <div className="mt-8 overflow-x-auto border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('columns.date')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.merchant')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.type')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.total')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.category')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-4 text-gray-600">
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(row.date)}
              </td>
              <td className="px-4 py-4 font-medium text-black">
                <Link href={`/${locale}/perso/comptabilite/${row.id}`} className="hover:underline">
                  {row.merchantName}
                </Link>
              </td>
              <td className="px-4 py-4 text-gray-600">{t(`types.${row.type}`)}</td>
              <td className="px-4 py-4 text-gray-600">${row.amountTotal}</td>
              <td className="px-4 py-4 text-gray-600">{row.category?.name ?? '-'}</td>
              <td className="px-4 py-4">
                {canMutate ? (
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-red-700 hover:text-red-900">{t('delete')}</button>
                  </form>
                ) : (
                  <span className="text-gray-400">{t('readOnly')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
