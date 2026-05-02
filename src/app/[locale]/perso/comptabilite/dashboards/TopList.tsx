import Link from 'next/link';

type TopListProps = {
  title: string;
  emptyLabel: string;
  items: { label: string; total: number; count: number; href?: string }[];
  locale: string;
};

export default function TopList({ title, emptyLabel, items, locale }: TopListProps) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' });

  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {items.map((item) => {
            const content = (
              <>
                <span className="truncate text-sm font-medium text-black">{item.label}</span>
                <span className="shrink-0 text-sm text-gray-600">{money.format(item.total)}</span>
              </>
            );

            return (
              <li key={item.label} className="flex items-center justify-between gap-4">
                {item.href ? (
                  <Link href={item.href} className="flex min-w-0 flex-1 items-center justify-between gap-4 hover:underline">
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-4">{content}</div>
                )}
                <span className="text-xs text-gray-400">{item.count}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
