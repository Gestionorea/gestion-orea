'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TransactionRow, TransactionSortBy, TransactionSortOrder } from '@/lib/transactions';
import BulkDeleteBar from './BulkDeleteBar';
import ClickableTransactionRow, { type TransactionRowLabels } from './TransactionRow';

export type TransactionListItem = {
  row: TransactionRow;
  href: string;
  merchantHref: string;
  labels: TransactionRowLabels;
};

export type TransactionListLabels = {
  columns: {
    select: string;
    date: string;
    merchant: string;
    type: string;
    total: string;
    category: string;
    paymentSource: string;
    property: string;
    company: string;
    reconciled: string;
    actions: string;
  };
};

export default function TransactionListClient({
  items,
  locale,
  canMutate,
  canReconcile,
  canDelete,
  sortBy,
  sortOrder,
  searchParams,
  basePath,
  labels,
}: {
  items: TransactionListItem[];
  locale: string;
  canMutate: boolean;
  canReconcile: boolean;
  canDelete: boolean;
  sortBy: TransactionSortBy;
  sortOrder: TransactionSortOrder;
  searchParams: Record<string, string>;
  basePath?: string;
  labels: TransactionListLabels;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemIds = useMemo(() => new Set(items.map((item) => item.row.id)), [items]);
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => itemIds.has(id)),
    [itemIds, selectedIds],
  );
  const allVisibleSelected =
    items.length > 0 && items.every((item) => validSelectedIds.includes(item.row.id));
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

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !itemIds.has(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...items.map((item) => item.row.id)])));
  }

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="mt-8">
      {canDelete ? (
        <BulkDeleteBar
          selectedIds={validSelectedIds}
          onDeleted={() => {
            setSelectedIds([]);
            router.refresh();
          }}
        />
      ) : null}

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
            <tr>
              {canDelete ? (
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 border-gray-300"
                    aria-label={labels.columns.select}
                    title={labels.columns.select}
                  />
                </th>
              ) : null}
              {renderSortableHeader('date', labels.columns.date)}
              {renderSortableHeader('merchant', labels.columns.merchant)}
              <th className="px-4 py-3 font-medium">{labels.columns.type}</th>
              {renderSortableHeader('total', labels.columns.total)}
              <th className="px-4 py-3 font-medium">{labels.columns.category}</th>
              {renderSortableHeader('paymentSource', labels.columns.paymentSource)}
              <th className="px-4 py-3 font-medium">{labels.columns.property}</th>
              {renderSortableHeader('company', labels.columns.company)}
              <th className="px-4 py-3 font-medium">{labels.columns.reconciled}</th>
              <th className="px-4 py-3 font-medium">{labels.columns.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <ClickableTransactionRow
                key={item.row.id}
                row={item.row}
                locale={locale}
                href={item.href}
                merchantHref={item.merchantHref}
                canMutate={canMutate}
                canReconcile={canReconcile}
                canDelete={canDelete}
                selected={validSelectedIds.includes(item.row.id)}
                onToggleSelected={toggleRow}
                labels={item.labels}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
