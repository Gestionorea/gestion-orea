import Link from 'next/link';

export default function YearTabs({
  years,
  activeYear,
  locale,
}: {
  years: number[];
  activeYear: number;
  locale: string;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {years.map((year) => (
        <Link
          key={year}
          href={`/${locale}/perso/comptabilite?year=${year}`}
          className={`border px-4 py-2 text-sm transition ${
            year === activeYear
              ? 'border-black bg-black text-white'
              : 'border-gray-300 text-black hover:border-black'
          }`}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
