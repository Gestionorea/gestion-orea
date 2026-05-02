import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

function shiftMonth(year: number, month: number, delta: -1 | 1) {
  const date = new Date(year, month - 1 + delta, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function monthLabel(locale: string, year: number, month: number) {
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function MonthNavigator({
  year,
  month,
  locale,
  searchParams,
}: {
  year: number;
  month: number;
  locale: string;
  searchParams: Record<string, string>;
}) {
  const t = await getTranslations('perso.compta.monthNavigator');
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const basePath = `/${locale}/perso/comptabilite`;

  const queryFor = (target: { year: number; month: number }) => ({
    ...searchParams,
    year: String(target.year),
    month: String(target.month),
    page: '1',
  });

  return (
    <div className="mt-4 flex items-center gap-2">
      <Link
        href={{ pathname: basePath, query: queryFor(previous) }}
        aria-label={t('previous')}
        className="border border-gray-300 px-4 py-2 text-sm text-black transition hover:border-black"
      >
        ‹
      </Link>
      <span className="border border-black bg-black px-4 py-2 text-sm text-white">
        {monthLabel(locale, year, month)}
      </span>
      <Link
        href={{ pathname: basePath, query: queryFor(next) }}
        aria-label={t('next')}
        className="border border-gray-300 px-4 py-2 text-sm text-black transition hover:border-black"
      >
        ›
      </Link>
    </div>
  );
}
