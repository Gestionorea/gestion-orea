'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { PreviewCategory, PreviewRow } from '@/app/actions/analyze-statement';
import type { TransactionVisualStatus } from '@/lib/transactions';
import CreateCategoryModal from './CreateCategoryModal';

const CREATE_CATEGORY_VALUE = '__create_category__';

export default function PreviewTable({
  rows,
  warnings,
  categories,
  onCategoryOverridesChange,
}: {
  rows: PreviewRow[];
  warnings: string[];
  categories: PreviewCategory[];
  onCategoryOverridesChange: (overrides: Record<number, string | null>) => void;
}) {
  const t = useTranslations('perso.importStatement.preview');
  const newCount = rows.filter((row) => row.status === 'new').length;
  const duplicateCount = rows.length - newCount;
  const [availableCategories, setAvailableCategories] = useState<PreviewCategory[]>(categories);
  const [createCategoryRowNumber, setCreateCategoryRowNumber] = useState<number | null>(null);
  const initialOverrides = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.rowNumber,
          row.status === 'new' ? row.suggestedCategoryId : null,
        ]),
      ) as Record<number, string | null>,
    [rows],
  );
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string | null>>(initialOverrides);

  useEffect(() => {
    setCategoryOverrides(initialOverrides);
  }, [initialOverrides]);

  useEffect(() => {
    setAvailableCategories(categories);
  }, [categories]);

  useEffect(() => {
    onCategoryOverridesChange(categoryOverrides);
  }, [categoryOverrides, onCategoryOverridesChange]);

  function categoriesForRow(row: PreviewRow): PreviewCategory[] {
    return availableCategories.filter((category) => category.type === 'both' || category.type === row.type);
  }

  function confidenceLabel(row: PreviewRow): string {
    if (row.suggestionConfidence === 'high') return t('suggestionConfidenceHigh');
    if (row.suggestionConfidence === 'medium') return t('suggestionConfidenceMedium');
    return t('suggestionConfidenceLow');
  }

  function previewVisualStatus(row: PreviewRow): TransactionVisualStatus {
    if (row.type === 'income') return 'income';
    if (row.status === 'duplicate') return 'neutral';
    if (row.suggestionConfidence === 'high') return 'recurring_ok';
    return 'missing_invoice';
  }

  function visualRowClass(status: TransactionVisualStatus): string {
    if (status === 'invoice_ok') return 'bg-green-50 hover:bg-green-100';
    if (status === 'missing_invoice') return 'bg-red-50 hover:bg-red-100';
    if (status === 'recurring_ok') return 'bg-yellow-50 hover:bg-yellow-100';
    if (status === 'income') return 'bg-white hover:bg-gray-50';
    return 'bg-gray-50';
  }

  function visualBadgeClass(status: TransactionVisualStatus): string {
    if (status === 'invoice_ok') return 'bg-green-500';
    if (status === 'missing_invoice') return 'bg-red-500';
    if (status === 'recurring_ok') return 'bg-yellow-500';
    if (status === 'income') return 'bg-blue-400';
    return '';
  }

  function visualStatusLabel(status: TransactionVisualStatus): string | null {
    if (status === 'invoice_ok') return t('visualStatus.invoiceOk');
    if (status === 'missing_invoice') return t('visualStatus.missingInvoice');
    if (status === 'recurring_ok') return t('visualStatus.recurringOk');
    if (status === 'income') return t('visualStatus.income');
    return null;
  }

  const createCategoryRow = rows.find((row) => row.rowNumber === createCategoryRowNumber) ?? null;

  return (
    <section className="grid gap-4">
      {warnings.length > 0 ? (
        <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-medium">{t('warnings')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
            <tr>
              <th className="px-3 py-3">{t('columnRow')}</th>
              <th className="px-3 py-3">{t('columnDate')}</th>
              <th className="px-3 py-3">{t('columnDescription')}</th>
              <th className="px-3 py-3 text-right">{t('columnAmount')}</th>
              <th className="px-3 py-3">{t('columnType')}</th>
              <th className="px-3 py-3">{t('columnCategory')}</th>
              <th className="px-3 py-3">{t('columnStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => {
              const isDuplicate = row.status === 'duplicate';
              const visualStatus = previewVisualStatus(row);
              const visualLabel = visualStatusLabel(visualStatus);

              return (
                <tr
                  key={row.rowNumber}
                  className={`${visualRowClass(visualStatus)} ${isDuplicate ? 'text-gray-500' : 'text-gray-900'}`}
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-2">
                      {visualLabel ? (
                        <span
                          className={`h-3 w-3 shrink-0 rounded-full ${visualBadgeClass(visualStatus)}`}
                          title={visualLabel}
                          aria-label={visualLabel}
                        />
                      ) : null}
                      <span>{row.rowNumber}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{row.date}</td>
                  <td className="max-w-sm px-3 py-3">{row.description}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{row.amountTotal}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.type === 'income' ? t('typeIncome') : t('typeExpense')}
                  </td>
                  <td className="min-w-56 px-3 py-3">
                    <select
                      disabled={isDuplicate}
                      value={categoryOverrides[row.rowNumber] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === CREATE_CATEGORY_VALUE) {
                          setCreateCategoryRowNumber(row.rowNumber);
                          return;
                        }

                        setCategoryOverrides((current) => ({
                          ...current,
                          [row.rowNumber]: value || null,
                        }));
                      }}
                      className="w-full border border-gray-300 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">{t('categoryNone')}</option>
                      <option value={CREATE_CATEGORY_VALUE}>{t('createCategory')}</option>
                      {categoriesForRow(row).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {row.status === 'new' && row.suggestionConfidence !== 'none' ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {confidenceLabel(row)} · {t('suggestion', { reason: row.suggestionReason })}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={
                        isDuplicate
                          ? 'inline-flex border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600'
                          : 'inline-flex border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-800'
                      }
                    >
                      {isDuplicate ? t('statusDuplicate') : t('statusNew')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
            <tr>
              <td colSpan={7} className="px-3 py-3">
                {t('footer', { newCount, duplicateCount })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {createCategoryRow ? (
        <CreateCategoryModal
          defaultType={createCategoryRow.type}
          onCancel={() => setCreateCategoryRowNumber(null)}
          onCreated={(category) => {
            setAvailableCategories((current) =>
              current.some((item) => item.id === category.id) ? current : [...current, category],
            );
            setCategoryOverrides((current) => ({
              ...current,
              [createCategoryRow.rowNumber]: category.id,
            }));
            setCreateCategoryRowNumber(null);
          }}
        />
      ) : null}
    </section>
  );
}
