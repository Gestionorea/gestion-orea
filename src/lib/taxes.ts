export const TAX_RATES_QC = { gst: 0.05, qst: 0.09975 };

function toCents(value: string): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function roundRate(baseCents: number, rate: number): number {
  return Math.round(baseCents * rate);
}

export function fromTotalQC(total: string): { beforeTax: string; gst: string; qst: string } {
  const totalCents = toCents(total);
  const beforeTaxCents = Math.round(totalCents / (1 + TAX_RATES_QC.gst + TAX_RATES_QC.qst));
  const gstCents = roundRate(beforeTaxCents, TAX_RATES_QC.gst);
  let qstCents = roundRate(beforeTaxCents, TAX_RATES_QC.qst);
  const reconstructedCents = beforeTaxCents + gstCents + qstCents;
  const diffCents = totalCents - reconstructedCents;

  if (Math.abs(diffCents) > 1) {
    qstCents += diffCents;
  } else if (diffCents !== 0) {
    qstCents += diffCents;
  }

  return {
    beforeTax: formatCents(beforeTaxCents),
    gst: formatCents(gstCents),
    qst: formatCents(qstCents),
  };
}

export function fromBeforeTaxQC(beforeTax: string): { gst: string; qst: string; total: string } {
  const beforeTaxCents = toCents(beforeTax);
  const gstCents = roundRate(beforeTaxCents, TAX_RATES_QC.gst);
  const qstCents = roundRate(beforeTaxCents, TAX_RATES_QC.qst);
  const totalCents = beforeTaxCents + gstCents + qstCents;

  return {
    gst: formatCents(gstCents),
    qst: formatCents(qstCents),
    total: formatCents(totalCents),
  };
}
