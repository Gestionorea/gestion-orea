'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { PreviewCategory, PreviewRow } from '@/app/actions/analyze-statement';

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
    onCategoryOverridesChange(categoryOverrides);
  }, [categoryOverrides, onCategoryOverridesChange]);

  function categoriesForRow(row: PreviewRow): PreviewCategory[] {
    return categories.filter((category) => category.type === 'both' || category.type === row.type);
  }

  function confidenceLabel(row: PreviewRow): string {
    if (row.suggestionConfidence === 'high') return t('suggestionConfidenceHigh');
    if (row.suggestionConfidence === 'medium') return t('suggestionConfidenceMedium');
    return t('suggestionConfidenceLow');
  }

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

              return (
                <tr key={row.rowNumber} className={isDuplicate ? 'bg-gray-50 text-gray-500' : 'text-gray-900'}>
                  <td className="whitespace-nowrap px-3 py-3">{row.rowNumber}</td>
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
                        const value = event.target.value || null;
                        setCategoryOverrides((current) => ({
                          ...current,
                          [row.rowNumber]: value,
                        }));
                      }}
                      className="w-full border border-gray-300 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">{t('categoryNone')}</option>
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
    </section>
  );
}
