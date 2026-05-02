type PaymentSourceBreakdownProps = {
  title: string;
  emptyLabel: string;
  personalLabel: string;
  items: { sourceId: string | null; sourceName: string; total: number; count: number; isPersonal: boolean }[];
  locale: string;
};

export default function PaymentSourceBreakdown({
  title,
  emptyLabel,
  personalLabel,
  items,
  locale,
}: PaymentSourceBreakdownProps) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' });

  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.sourceId ?? 'none'} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-black">{item.sourceName}</p>
                  {item.isPersonal ? (
                    <span className="rounded bg-yellow-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-800">
                      {personalLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.count}</p>
              </div>
              <p className="shrink-0 text-sm text-gray-600">{money.format(item.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
