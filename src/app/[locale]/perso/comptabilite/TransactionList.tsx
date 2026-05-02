import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { deleteTransactionAction, toggleReconciledAction } from '@/app/actions/transactions';
import { slugifyMerchantName, type TransactionRow, type TransactionSortBy, type TransactionSortOrder } from '@/lib/transactions';

export default async function TransactionList({
  rows,
  locale,
  canMutate,
  canReconcile,
  sortBy = 'date',
  sortOrder = 'desc',
  searchParams = {},
  basePath,
}: {
  rows: TransactionRow[];
  locale: string;
  canMutate: boolean;
  canReconcile: boolean;
  sortBy?: TransactionSortBy;
  sortOrder?: TransactionSortOrder;
  searchParams?: Record<string, string>;
  basePath?: string;
}) {
  const t = await getTranslations('perso.compta');
  const sortableColumns: Record<string, TransactionSortBy> = {
    date: 'date',
    merchant: 'merchant',
    total: 'amount',
    company: 'company',
    paymentSource: 'source',
  };

  function sortHref(column: TransactionSortBy) {
    const nextOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    return {
      pathname: basePath ?? `/${locale}/perso/comptabilite`,
      query: {
        ...searchParams,
        sortBy: column,
        sortOrder: nextOrder,
        page: '1',
      },
    };
  }

  function renderSortableHeader(columnKey: keyof typeof sortableColumns, label: string) {
    const column = sortableColumns[columnKey];
    const active = sortBy === column;

    return (
      <th key={columnKey} className="px-4 py-3 font-medium">
        <Link
          href={sortHref(column)}
          className="inline-flex items-center gap-1 text-gray-500 transition hover:text-black"
        >
          <span>{label}</span>
          {active ? <span aria-hidden="true">{sortOrder === 'asc' ? '▲' : '▼'}</span> : null}
        </Link>
      </th>
    );
  }

  return (
    <div className="mt-8 overflow-x-auto border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
          <tr>
            {renderSortableHeader('date', t('columns.date'))}
            {renderSortableHeader('merchant', t('columns.merchant'))}
            <th className="px-4 py-3 font-medium">{t('columns.type')}</th>
            {renderSortableHeader('total', t('columns.total'))}
            <th className="px-4 py-3 font-medium">{t('columns.category')}</th>
            {renderSortableHeader('paymentSource', t('columns.paymentSource'))}
            <th className="px-4 py-3 font-medium">{t('columns.property')}</th>
            {renderSortableHeader('company', t('columns.company'))}
            <th className="px-4 py-3 font-medium">{t('columns.reconciled')}</th>
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
                <Link
                  href={`/${locale}/perso/comptabilite/fournisseur/${slugifyMerchantName(row.merchantName)}`}
                  className="hover:underline"
                >
                  {row.merchantName}
                </Link>
              </td>
              <td className="px-4 py-4 text-gray-600">{t(`types.${row.type}`)}</td>
              <td className="px-4 py-4 text-gray-600">${row.amountTotal}</td>
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
                      {t('advance.badge')}
                    </span>
                  ) : null}
                  {row.isAdvance && row.reimbursedAt ? (
                    <span className="w-fit rounded bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600">
                      {t('advance.reimbursed')}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4 text-gray-600">{row.property?.name ?? '-'}</td>
              <td className="px-4 py-4 text-gray-600">{row.company?.name ?? '-'}</td>
              <td className="px-4 py-4 text-gray-600">
                {canReconcile ? (
                  <form action={toggleReconciledAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="reconciled" value={row.reconciledAt ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className="inline-flex h-5 w-5 items-center justify-center border border-gray-300 hover:border-black"
                      aria-label={row.reconciledAt ? t('reconciled.unmark') : t('reconciled.mark')}
                      title={
                        row.reconciledAt
                          ? `${t('reconciled.yes')} ${row.reconciledBy ? t('reconciled.by', { username: row.reconciledBy.username }) : ''}`
                          : t('reconciled.mark')
                      }
                    >
                      {row.reconciledAt ? '✓' : ''}
                    </button>
                  </form>
                ) : row.reconciledAt ? (
                  <span title={row.reconciledBy ? t('reconciled.by', { username: row.reconciledBy.username }) : ''}>
                    ✓
                  </span>
                ) : (
                  <span className="text-gray-400">{t('reconciled.no')}</span>
                )}
              </td>
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
