'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  analyzeStatementAction,
  type AnalyzeStatementResult,
} from '@/app/actions/analyze-statement';
import type { PaymentSourceItem } from '@/lib/paymentSources';

function SubmitButton() {
  const t = useTranslations('perso.importStatement.form');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

function paymentSourceLabel(source: PaymentSourceItem): string {
  return source.lastDigits ? `${source.name} • ${source.lastDigits}` : source.name;
}

export default function UploadForm({
  paymentSources,
}: {
  paymentSources: PaymentSourceItem[];
}) {
  const t = useTranslations('perso.importStatement');
  const [state, formAction] = useActionState<AnalyzeStatementResult | null, FormData>(
    analyzeStatementAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 grid max-w-3xl gap-5">
      {state?.ok === false ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}
      {state?.ok === true ? (
        <div className="border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Preview a venir
        </div>
      ) : null}

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-black">{t('form.paymentSource')}</span>
        <select
          name="paymentSourceId"
          required
          defaultValue=""
          className="border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>{t('form.paymentSourcePlaceholder')}</option>
          {paymentSources.map((source) => (
            <option key={source.id} value={source.id}>
              {paymentSourceLabel(source)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-black">{t('form.file')}</span>
        <input
          name="file"
          type="file"
          required
          accept=".csv,.xlsx,.xls"
          className="border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
