import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { slugifyMerchantName, type TransactionRow, type TransactionSortBy, type TransactionSortOrder } from '@/lib/transactions';
import ClickableTransactionRow from './TransactionRow';

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
            <ClickableTransactionRow
              key={row.id}
              row={row}
              locale={locale}
              href={`/${locale}/perso/comptabilite/${row.id}`}
              merchantHref={`/${locale}/perso/comptabilite/fournisseur/${slugifyMerchantName(row.merchantName)}`}
              canMutate={canMutate}
              canReconcile={canReconcile}
              labels={{
                type: t(`types.${row.type}`),
                advanceBadge: t('advance.badge'),
                advanceReimbursed: t('advance.reimbursed'),
                reconciledMark: t('reconciled.mark'),
                reconciledUnmark: t('reconciled.unmark'),
                reconciledNo: t('reconciled.no'),
                reconciledTitle: row.reconciledAt
                  ? `${t('reconciled.yes')} ${row.reconciledBy ? t('reconciled.by', { username: row.reconciledBy.username }) : ''}`
                  : t('reconciled.mark'),
                delete: t('delete'),
                readOnly: t('readOnly'),
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
