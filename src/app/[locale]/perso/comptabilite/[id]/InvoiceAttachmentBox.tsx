'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  linkOneDriveInvoiceAction,
  searchOneDriveInvoicesAction,
  unlinkOneDriveInvoiceAction,
  type SearchInvoicesState,
} from '@/app/actions/link-invoice';
import type { OneDriveFileItem } from '@/lib/onedrive';

function formatBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mb)} MB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ItemPreview({ item, locale }: { item: OneDriveFileItem; locale: string }) {
  const t = useTranslations('perso.compta.invoiceLink');

  return (
    <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-80 border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg group-hover:block">
      <p className="font-medium text-black">{item.name}</p>
      <dl className="mt-2 grid gap-1">
        <div className="flex justify-between gap-3">
          <dt>{t('size')}</dt>
          <dd>{formatBytes(item.size, locale)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t('modified')}</dt>
          <dd>{formatDate(item.lastModifiedDateTime, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function InvoiceAttachmentBox({
  transactionId,
  locale,
  linkedItem,
  attachmentUrl,
  attachmentItemId,
  canEdit,
}: {
  transactionId: string;
  locale: string;
  linkedItem: OneDriveFileItem | null;
  attachmentUrl: string | null;
  attachmentItemId: string | null;
  canEdit: boolean;
}) {
  const t = useTranslations('perso.compta.invoiceLink');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchState, searchAction] = useActionState<SearchInvoicesState | null, FormData>(
    searchOneDriveInvoicesAction,
    null,
  );
  const items = searchState?.ok ? searchState.items : [];

  function linkItem(itemId: string) {
    setLinkError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('transactionId', transactionId);
      formData.set('itemId', itemId);
      const result = await linkOneDriveInvoiceAction(formData);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function unlinkItem() {
    setLinkError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('transactionId', transactionId);
      const result = await unlinkOneDriveInvoiceAction(formData);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {linkedItem || attachmentUrl ? (
        <div className="grid gap-3 border border-green-200 bg-green-50 p-4">
          <div className="relative group w-fit">
            <p className="text-sm font-medium text-green-950">
              {linkedItem?.name ?? t('legacyLink')}
            </p>
            {linkedItem ? <ItemPreview item={linkedItem} locale={locale} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {attachmentUrl ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-black px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white"
              >
                {t('open')}
              </a>
            ) : null}
            {attachmentItemId ? (
              <a
                href={`/api/onedrive/invoices/${encodeURIComponent(attachmentItemId)}/download`}
                className="inline-flex border border-gray-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-black hover:border-black"
              >
                {t('download')}
              </a>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={unlinkItem}
                disabled={isPending}
                className="inline-flex border border-red-200 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-red-700 hover:border-red-700 disabled:text-gray-400"
              >
                {t('unlink')}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('empty')}</p>
      )}

      {canEdit ? (
        <div className="grid gap-3 border border-gray-200 bg-white p-4">
          <form action={searchAction} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="transactionId" value={transactionId} />
            <input
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="min-w-0 flex-1 border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="bg-black px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white">
              {t('search')}
            </button>
          </form>

          {searchState?.ok === false ? (
            <p className="text-sm text-red-700">{searchState.error}</p>
          ) : null}
          {linkError ? <p className="text-sm text-red-700">{linkError}</p> : null}

          {items.length > 0 ? (
            <div className="divide-y divide-gray-200 border border-gray-200">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative group min-w-0">
                    <p className="truncate text-sm font-medium text-black">{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatBytes(item.size, locale)} · {formatDate(item.lastModifiedDateTime, locale)}
                    </p>
                    <ItemPreview item={item} locale={locale} />
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
            <p className="text-sm text-gray-500">{t('noResults')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
