import Link from 'next/link';

type YearSelectorProps = {
  years: number[];
  activeYear: number;
  locale: string;
};

export default function YearSelector({ years, activeYear, locale }: YearSelectorProps) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {years.map((year) => (
        <Link
          key={year}
          href={{ pathname: `/${locale}/perso/comptabilite/dashboards`, query: { year } }}
          className={[
            'border px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition-colors',
            year === activeYear
              ? 'border-black bg-black text-white'
              : 'border-gray-200 text-gray-500 hover:border-black hover:text-black',
          ].join(' ')}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
