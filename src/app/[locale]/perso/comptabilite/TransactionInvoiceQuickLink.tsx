'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  linkOneDriveInvoiceAction,
  searchOneDriveInvoicesAction,
  type SearchInvoicesState,
} from '@/app/actions/link-invoice';
import type { TransactionRow } from '@/lib/transactions';

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function transactionLabel(transaction: TransactionRow, locale: string): string {
  return `${formatDate(transaction.date, locale)} · ${transaction.merchantName} · ${transaction.amountTotal} $`;
}

export default function TransactionInvoiceQuickLink({
  rows,
  locale,
  canMutate,
}: {
  rows: TransactionRow[];
  locale: string;
  canMutate: boolean;
}) {
  const t = useTranslations('perso.compta.invoiceQuickLink');
  const router = useRouter();
  const candidates = useMemo(
    () => rows.filter((row) => row.type === 'expense'),
    [rows],
  );
  const missingInvoice = candidates.filter((row) => !row.attachmentUrl);
  const [selectedTransactionId, setSelectedTransactionId] = useState(missingInvoice[0]?.id ?? candidates[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchState, searchAction] = useActionState<SearchInvoicesState | null, FormData>(
    searchOneDriveInvoicesAction,
    null,
  );

  if (!canMutate || candidates.length === 0) return null;

  function linkItem(itemId: string) {
    setLinkError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('transactionId', selectedTransactionId);
      formData.set('itemId', itemId);
      const result = await linkOneDriveInvoiceAction(formData);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-8 border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl tracking-[0.06em] text-black">{t('title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <span className="w-fit border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
          {t('missingCount', { count: missingInvoice.length })}
        </span>
      </div>

      <form action={searchAction} className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_auto]">
        <input type="hidden" name="transactionId" value={selectedTransactionId} />
        <select
          value={selectedTransactionId}
          onChange={(event) => setSelectedTransactionId(event.target.value)}
          className="border border-gray-300 px-3 py-2 text-sm"
        >
          {candidates.map((transaction) => (
            <option key={transaction.id} value={transaction.id}>
              {transactionLabel(transaction, locale)}
            </option>
          ))}
        </select>
        <input
          name="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="bg-black px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white">
          {t('search')}
        </button>
      </form>

      {searchState?.ok === false ? <p className="mt-3 text-sm text-red-700">{searchState.error}</p> : null}
      {linkError ? <p className="mt-3 text-sm text-red-700">{linkError}</p> : null}

      {searchState?.ok && searchState.items.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {searchState.items.slice(0, 6).map((item) => (
            <div key={item.id} className="flex flex-col gap-2 border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-black">{item.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.lastModifiedDateTime))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => linkItem(item.id)}
                disabled={isPending}
                className="shrink-0 border border-gray-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-black hover:border-black disabled:text-gray-400"
              >
                {t('link')}
              </button>
            </div>
          ))}
        </div>
      ) : searchState?.ok ? (
        <p className="mt-3 text-sm text-gray-500">{t('noResults')}</p>
      ) : null}
    </section>
  );
}
