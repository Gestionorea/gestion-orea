'use server';

import { requireOwner } from '@/lib/permissions';

export type AnalyzeStatementResult =
  | { ok: true; preview: unknown[]; warnings: string[] }
  | { ok: false; error: string };

export async function analyzeStatementAction(
  _prevState: AnalyzeStatementResult | null,
  formData: FormData,
): Promise<AnalyzeStatementResult> {
  await requireOwner();

  const paymentSourceId = formData.get('paymentSourceId');
  const file = formData.get('file');

  if (typeof paymentSourceId !== 'string' || !paymentSourceId) {
    return { ok: false, error: 'PaymentSource requis' };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Fichier requis' };
  }

  return {
    ok: false,
    error: 'Parser CSV/XLSX pas encore implemente. Cette page est en developpement.',
  };
}
