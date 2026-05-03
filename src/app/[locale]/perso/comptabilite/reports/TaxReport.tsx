'use client';

import type { TaxReport as TaxReportData } from '@/lib/tax-report';

type TaxReportProps = {
  report: TaxReportData;
  locale: string;
  labels: {
    print: string;
    table: {
      salesTaxable: string;
      gstCollected: string;
      qstCollected: string;
      purchasesTaxable: string;
      gstPaid: string;
      qstPaid: string;
      gstRemittance: string;
      qstRemittance: string;
    };
  };
};

function money(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(value);
}

export default function TaxReport({ report, locale, labels }: TaxReportProps) {
  const rows = [
    { label: labels.table.salesTaxable, value: report.salesTaxable },
    { label: labels.table.gstCollected, value: report.gstCollected },
    { label: labels.table.qstCollected, value: report.qstCollected },
    { label: labels.table.purchasesTaxable, value: report.purchasesTaxable },
    { label: labels.table.gstPaid, value: report.gstPaid },
    { label: labels.table.qstPaid, value: report.qstPaid },
    { label: labels.table.gstRemittance, value: report.gstRemittance },
    { label: labels.table.qstRemittance, value: report.qstRemittance },
  ];

  return (
    <div className="mt-8 border border-gray-200 bg-white p-5 print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">TPS/TVQ</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-gray-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-black hover:border-black print:hidden"
        >
          {labels.print}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="py-3 pr-4 text-left font-medium text-gray-600">{row.label}</th>
                <td className="py-3 pl-4 text-right font-medium text-black">{money(locale, row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
