'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  linkInvoiceToTransactionAction,
  listInvoicesForMonthAction,
  unlinkInvoiceAction,
  type InvoiceCandidate,
} from '@/app/actions/link-invoice';

function sourceLabel(source: InvoiceCandidate['source'], t: ReturnType<typeof useTranslations>): string {
  if (source === 'month-traitees') return t('sourceMonthTraitees');
  if (source === 'month-pending') return t('sourceMonthPending');
  return t('sourceInboxVrac');
}

function fileNameFromUrl(url: string | null): string {
  if (!url) return '';

  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
}

export default function InvoiceLinker({
  transactionId,
  transactionDate,
  attachmentUrl,
}: {
  transactionId: string;
  transactionDate: Date;
  attachmentUrl: string | null;
}) {
  const t = useTranslations('perso.compta.invoiceLinker');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceCandidate[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hoveredInvoice, setHoveredInvoice] = useState<InvoiceCandidate | null>(null);
  const [isPending, startTransition] = useTransition();
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth() + 1;
  const monthKey = `${year}-${month}`;
  const attachedFileName = useMemo(() => fileNameFromUrl(attachmentUrl), [attachmentUrl]);

  function loadInvoices() {
    setOpen((current) => !current);
    if (loadedKey === monthKey) return;

    setError(null);
    startTransition(async () => {
      const result = await listInvoicesForMonthAction(year, month);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setInvoices(result.invoices);
      setLoadedKey(monthKey);
    });
  }

  function linkInvoice(invoice: InvoiceCandidate) {
    setError(null);
    startTransition(async () => {
      const result = await linkInvoiceToTransactionAction(transactionId, invoice.webUrl);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  function unlinkInvoice() {
    setError(null);
    startTransition(async () => {
      const result = await unlinkInvoiceAction(transactionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative min-w-[11rem]" onClick={(event) => event.stopPropagation()}>
      {attachmentUrl ? (
        <div className="grid gap-2">
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-medium text-green-700 hover:underline"
            title={attachedFileName || t('open')}
          >
            {t('attached')}
          </a>
          <button
            type="button"
            onClick={unlinkInvoice}
            disabled={isPending}
            className="w-fit text-xs text-gray-500 hover:text-black disabled:cursor-not-allowed"
          >
            {t('unlink')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={loadInvoices}
          disabled={isPending}
          className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:border-black hover:text-black disabled:cursor-not-allowed"
        >
          {isPending ? t('loading') : t('attach')}
        </button>
      )}

      {!attachmentUrl && open ? (
        <div className="absolute right-0 z-20 mt-2 w-96 border border-gray-200 bg-white shadow-lg">
          <div className="max-h-80 overflow-auto p-2">
            {error ? <p className="px-2 py-2 text-xs text-red-700">{error}</p> : null}
            {!error && isPending ? <p className="px-2 py-2 text-xs text-gray-500">{t('loading')}</p> : null}
            {!error && !isPending && invoices.length === 0 ? (
              <p className="px-2 py-2 text-xs text-gray-500">{t('empty')}</p>
            ) : null}
            {invoices.map((invoice) => (
              <button
                key={invoice.itemId}
                type="button"
                onClick={() => linkInvoice(invoice)}
                onMouseEnter={() => setHoveredInvoice(invoice)}
                onMouseLeave={() => setHoveredInvoice(null)}
                className="grid w-full gap-1 px-2 py-2 text-left text-xs hover:bg-gray-50"
              >
                <span className="line-clamp-2 font-medium text-black">{invoice.filename}</span>
                <span className="text-gray-500">
                  {sourceLabel(invoice.source, t)} · {invoice.sizeKb} KB
                </span>
              </button>
            ))}
          </div>
          {hoveredInvoice ? (
            <div className="absolute right-full top-0 mr-2 hidden w-56 border border-gray-200 bg-white p-2 shadow-lg lg:block">
              <Image
                src={`/api/invoice-thumbnail/${encodeURIComponent(hoveredInvoice.itemId)}`}
                alt={hoveredInvoice.filename}
                width={224}
                height={288}
                unoptimized
                className="max-h-72 w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
