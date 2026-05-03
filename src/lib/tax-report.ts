import { getDb } from '@/lib/db';

export type TaxReportPeriod = {
  year: number;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
};

export type TaxReport = {
  period: TaxReportPeriod;
  salesTaxable: number;
  gstCollected: number;
  qstCollected: number;
  purchasesTaxable: number;
  gstPaid: number;
  qstPaid: number;
  gstRemittance: number;
  qstRemittance: number;
};

function periodRange(period: TaxReportPeriod) {
  if (period.month) {
    return {
      gte: new Date(period.year, period.month - 1, 1),
      lt: new Date(period.year, period.month, 1),
    };
  }

  if (period.quarter) {
    const startMonth = (period.quarter - 1) * 3;
    return {
      gte: new Date(period.year, startMonth, 1),
      lt: new Date(period.year, startMonth + 3, 1),
    };
  }

  return {
    gte: new Date(period.year, 0, 1),
    lt: new Date(period.year + 1, 0, 1),
  };
}

export async function generateTaxReport(period: TaxReportPeriod): Promise<TaxReport> {
  const rows = await getDb().transaction.findMany({
    where: {
      date: periodRange(period),
      taxRegime: 'taxable_qc',
    },
    select: {
      type: true,
      amountBeforeTax: true,
      gst: true,
      qst: true,
    },
  });
  const report: TaxReport = {
    period,
    salesTaxable: 0,
    gstCollected: 0,
    qstCollected: 0,
    purchasesTaxable: 0,
    gstPaid: 0,
    qstPaid: 0,
    gstRemittance: 0,
    qstRemittance: 0,
  };

  for (const row of rows) {
    if (row.type === 'income') {
      report.salesTaxable += Number(row.amountBeforeTax);
      report.gstCollected += Number(row.gst ?? 0);
      report.qstCollected += Number(row.qst ?? 0);
    } else {
      report.purchasesTaxable += Number(row.amountBeforeTax);
      report.gstPaid += Number(row.gst ?? 0);
      report.qstPaid += Number(row.qst ?? 0);
    }
  }

  report.gstRemittance = report.gstCollected - report.gstPaid;
  report.qstRemittance = report.qstCollected - report.qstPaid;

  return report;
}
