'use client';

import { useState } from 'react';
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
import {
  processScannerInboxAction,
  type ProcessScannerInboxResult,
} from '@/app/actions/process-scanner-inbox';

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

function ScannerInboxResultPanel({ result }: { result: ProcessScannerInboxResult }) {
  return (
    <div className="max-h-72 overflow-auto border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p>
        Scannés: {result.scanned} · Renommés: {result.renamed} · Échecs: {result.failed}
      </p>
      {result.items.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs">
          {result.items.map((item) => (
            <li key={item.originalFilename} className="font-mono">
              {item.status === 'renamed' ? (
                <span className="text-green-700">
                  ✓ {item.originalFilename} → {item.newFilename}
                </span>
              ) : (
                <span className="text-red-700">
                  ✗ {item.originalFilename} ({item.status}: {item.reason ?? '—'})
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AttachResult({ result }: { result: AutoAttachInvoicesResult }) {
  const t = useTranslations('perso.importStatement.sync.result');
  const syncT = useTranslations('perso.importStatement.sync');
  const monthName = result.month >= 1 && result.month <= 12 ? syncT(`monthNames.${MONTH_KEYS[result.month - 1]}`) : '-';

  return (
    <div className="max-h-56 overflow-auto border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p>{t('scopeLabel', { month: monthName, year: result.year })}</p>
      <p>{t('matchesCreated', { count: result.matchesCreated })}</p>
      <p>{t('invoicesMoved', { count: result.invoicesMoved })}</p>
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

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

function defaultMonthScope(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    month: now.getMonth() === 0 ? 12 : now.getMonth(),
  };
}

export default function SyncButtons() {
  const t = useTranslations('perso.importStatement.sync');
  const defaultScope = defaultMonthScope();
  const [selectedYear, setSelectedYear] = useState(defaultScope.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultScope.month);
  const [relevesState, syncRelevesAction] = useActionState<SyncOneDriveRelevesResult | null, FormData>(
    syncOneDriveRelevesAction,
    null,
  );
  const [attachState, attachInvoicesAction] = useActionState<AutoAttachInvoicesResult | null, FormData>(
    autoAttachInvoicesAction,
    null,
  );
  const [scannerState, scannerInboxAction] = useActionState<ProcessScannerInboxResult | null, FormData>(
    processScannerInboxAction,
    null,
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 1 - 2024 + 1 }, (_, index) => 2024 + index);

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
        <form action={scannerInboxAction}>
          <SyncSubmitButton label="Renommer mes scans" />
        </form>
        <form action={attachInvoicesAction} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            {t('selectYear')}
            <select
              name="year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="border border-gray-300 px-3 py-2 text-sm font-normal"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            {t('selectMonth')}
            <select
              name="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="border border-gray-300 px-3 py-2 text-sm font-normal"
            >
              {MONTH_KEYS.map((key, index) => (
                <option key={key} value={index + 1}>
                  {t(`monthNames.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <SyncSubmitButton label={t('syncInvoices')} />
        </form>
      </div>

      {relevesState ? <RelevesResult result={relevesState} /> : null}
      {scannerState ? <ScannerInboxResultPanel result={scannerState} /> : null}
      {attachState ? <AttachResult result={attachState} /> : null}
    </section>
  );
}
