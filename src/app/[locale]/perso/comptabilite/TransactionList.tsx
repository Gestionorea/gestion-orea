import { getTranslations } from 'next-intl/server';
import type { CategoryItem } from '@/lib/categories';
import { slugifyMerchantName, type TransactionRow, type TransactionSortBy, type TransactionSortOrder } from '@/lib/transactions';
import TransactionListClient, { type TransactionListItem, type TransactionListLabels } from './TransactionListClient';
import type { InlineCategoryOption } from './InlineCategorySelect';

export default async function TransactionList({
  rows,
  locale,
  canMutate,
  canReconcile,
  canDelete = false,
  categories = [],
  sortBy = 'date',
  sortOrder = 'desc',
  searchParams = {},
  basePath,
}: {
  rows: TransactionRow[];
  locale: string;
  canMutate: boolean;
  canReconcile: boolean;
  canDelete?: boolean;
  categories?: CategoryItem[];
  sortBy?: TransactionSortBy;
  sortOrder?: TransactionSortOrder;
  searchParams?: Record<string, string>;
  basePath?: string;
}) {
  const t = await getTranslations('perso.compta');
  const labels: TransactionListLabels = {
    columns: {
      select: t('bulkDelete.selectAll'),
      date: t('columns.date'),
      merchant: t('columns.merchant'),
      type: t('columns.type'),
      total: t('columns.total'),
      category: t('columns.category'),
      justification: t('inlineEdit.justificationHeader'),
      paymentSource: t('columns.paymentSource'),
      property: t('columns.property'),
      company: t('columns.company'),
      reconciled: t('columns.reconciled'),
      actions: t('columns.actions'),
    },
  };
  const items: TransactionListItem[] = rows.map((row) => ({
    row,
    href: `/${locale}/perso/comptabilite/${row.id}`,
    merchantHref: `/${locale}/perso/comptabilite/fournisseur/${slugifyMerchantName(row.merchantName)}`,
    labels: {
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
    },
  }));
  const categoryOptions: InlineCategoryOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
  }));

  return (
    <TransactionListClient
      items={items}
      locale={locale}
      canMutate={canMutate}
      canReconcile={canReconcile}
      canDelete={canDelete}
      categories={categoryOptions}
      sortBy={sortBy}
      sortOrder={sortOrder}
      searchParams={searchParams}
      basePath={basePath}
      labels={labels}
    />
  );
}
