'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  syncOneDriveRelevesAction,
  type SyncOneDriveRelevesResult,
} from '@/app/actions/sync-onedrive-releves';
import {
  autoAttachInvoicesAction,
  type AutoAttachInvoicesResult,
} from '@/app/actions/auto-attach-invoices';

function SyncSubmitButton({ label }: { label: string }) {
  const t = useTranslations('perso.importStatement.sync');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-black px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white"
    >
      {pending ? t('syncing') : label}
    </button>
  );
}

function RelevesResult({ result }: { result: SyncOneDriveRelevesResult }) {
  const t = useTranslations('perso.importStatement.sync.result');

  return (
    <div className="max-h-56 overflow-auto border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p>{t('filesProcessed', { count: result.processedFiles })}</p>
      <p>{t('filesImported', { count: result.importedFiles })}</p>
      <p>{t('filesSkipped', { count: result.skippedFiles })}</p>
      {result.details.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {result.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {result.errors.length > 0 ? (
        <div className="mt-3 text-red-800">
          <p className="font-medium">{t('errors')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.errors.map((error) => (
              <li key={`${error.filename}-${error.reason}`}>
                {error.filename}: {error.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AttachResult({ result }: { result: AutoAttachInvoicesResult }) {
  const t = useTranslations('perso.importStatement.sync.result');

  return (
    <div className="max-h-56 overflow-auto border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p>{t('matchesCreated', { count: result.matchesCreated })}</p>
      {result.matches.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {result.matches.map((match) => (
            <li key={`${match.txId}-${match.invoiceFilename}`}>
              {match.invoiceFilename} · {match.score}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function SyncButtons() {
  const t = useTranslations('perso.importStatement.sync');
  const [relevesState, syncRelevesAction] = useActionState<SyncOneDriveRelevesResult | null, FormData>(
    syncOneDriveRelevesAction,
    null,
  );
  const [attachState, attachInvoicesAction] = useActionState<AutoAttachInvoicesResult | null, FormData>(
    autoAttachInvoicesAction,
    null,
  );

  return (
    <section className="grid gap-4 border border-gray-200 bg-white p-4">
      <div>
        <h2 className="font-serif text-xl tracking-[0.06em] text-black">{t('title')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={syncRelevesAction}>
          <SyncSubmitButton label={t('syncReleves')} />
        </form>
        <form action={attachInvoicesAction}>
          <SyncSubmitButton label={t('syncInvoices')} />
        </form>
      </div>

      {relevesState ? <RelevesResult result={relevesState} /> : null}
      {attachState ? <AttachResult result={attachState} /> : null}
    </section>
  );
}
