type AdvancesSummaryProps = {
  title: string;
  unreimbursedLabel: string;
  reimbursedLabel: string;
  summary: {
    unreimbursedTotal: number;
    unreimbursedCount: number;
    reimbursedTotal: number;
    reimbursedCount: number;
  };
  locale: string;
};

export default function AdvancesSummary({
  title,
  unreimbursedLabel,
  reimbursedLabel,
  summary,
  locale,
}: AdvancesSummaryProps) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' });

  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded bg-yellow-50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-yellow-800">{unreimbursedLabel}</p>
          <p className="mt-2 text-xl font-medium text-black">{money.format(summary.unreimbursedTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">{summary.unreimbursedCount}</p>
        </div>
        <div className="rounded bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-600">{reimbursedLabel}</p>
          <p className="mt-2 text-xl font-medium text-black">{money.format(summary.reimbursedTotal)}</p>
          <p className="mt-1 text-xs text-gray-500">{summary.reimbursedCount}</p>
        </div>
      </div>
    </div>
  );
}
