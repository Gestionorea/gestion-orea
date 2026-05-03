type CompanyBalanceCardProps = {
  title: string;
  emptyLabel: string;
  noneLabel: string;
  locale: string;
  rows: {
    companyId: string;
    companyName: string;
    income: number;
    expense: number;
    balance: number;
  }[];
  labels: {
    company: string;
    income: string;
    expense: string;
    balance: string;
  };
};

function money(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(value);
}

export default function CompanyBalanceCard({
  title,
  emptyLabel,
  noneLabel,
  locale,
  rows,
  labels,
}: CompanyBalanceCardProps) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="py-2 pr-4 font-medium">{labels.company}</th>
                <th className="px-4 py-2 text-right font-medium">{labels.income}</th>
                <th className="px-4 py-2 text-right font-medium">{labels.expense}</th>
                <th className="py-2 pl-4 text-right font-medium">{labels.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.companyId}>
                  <td className="py-3 pr-4 font-medium text-black">
                    {row.companyName === '__none__' ? noneLabel : row.companyName}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{money(locale, row.income)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{money(locale, row.expense)}</td>
                  <td className="py-3 pl-4 text-right font-medium text-black">{money(locale, row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
