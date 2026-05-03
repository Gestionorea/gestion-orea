import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Prisma } from '@prisma/client';
import { getDb } from '@/lib/db';
import { requireOwner } from '@/lib/permissions';
import TrashList, { type TrashedTransactionRow } from './TrashList';

function dateValue(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function endOfDay(value: string): Date {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date;
}

function serializeRow(row: {
  id: string;
  date: Date;
  merchantName: string;
  amountTotal: { toFixed: (digits: number) => string };
  type: 'income' | 'expense';
  deletedAt: Date | null;
  paymentSource: { name: string; lastDigits: string | null } | null;
  category: { name: string } | null;
}): TrashedTransactionRow {
  return {
    id: row.id,
    date: row.date,
    merchantName: row.merchantName,
    amountTotal: row.amountTotal.toFixed(2),
    type: row.type,
    deletedAt: row.deletedAt,
    deletedBy: null,
    paymentSource: row.paymentSource
      ? {
          name: row.paymentSource.name,
          lastDigits: row.paymentSource.lastDigits,
        }
      : null,
    category: row.category ? { name: row.category.name } : null,
  };
}

export default async function TrashPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations('perso.compta.trash');
  const deletedFrom = dateValue(rawSearchParams.deletedFrom);
  const deletedTo = dateValue(rawSearchParams.deletedTo);
  const where: Prisma.TransactionWhereInput = {
    deletedAt: {
      not: null,
      ...(deletedFrom ? { gte: new Date(`${deletedFrom}T00:00:00`) } : {}),
      ...(deletedTo ? { lt: endOfDay(deletedTo) } : {}),
    },
  };

  const rows = await getDb().transaction.findMany({
    where,
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      date: true,
      merchantName: true,
      amountTotal: true,
      type: true,
      deletedAt: true,
      paymentSource: { select: { name: true, lastDigits: true } },
      category: { select: { name: true } },
    },
    take: 500,
  });
  const serializedRows = rows.map(serializeRow);

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
      <p className="mt-3 max-w-3xl text-sm text-gray-600">{t('subtitle')}</p>
      <div className="mt-6 border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        {t('banner', { count: serializedRows.length })}
      </div>
      <form className="mt-6 flex flex-wrap items-end gap-3 border border-gray-200 bg-white p-4">
        <label className="grid gap-2 text-sm font-medium text-gray-700">
          {t('filterFrom')}
          <input
            type="date"
            name="deletedFrom"
            defaultValue={deletedFrom}
            className="border border-gray-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-gray-700">
          {t('filterTo')}
          <input
            type="date"
            name="deletedTo"
            defaultValue={deletedTo}
            className="border border-gray-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <button
          type="submit"
          className="border border-gray-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-700 hover:border-black hover:text-black"
        >
          {t('filterApply')}
        </button>
      </form>
      <TrashList rows={serializedRows} locale={locale} />
    </div>
  );
}
