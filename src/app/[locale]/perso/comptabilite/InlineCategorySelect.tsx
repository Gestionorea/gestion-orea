'use client';

import { useState, useTransition, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { updateTransactionCategory } from '@/app/actions/inline-update-transaction';

export type InlineCategoryOption = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
};

type InlineCategorySelectProps = {
  transactionId: string;
  currentCategoryId: string | null;
  categories: InlineCategoryOption[];
};

type Feedback = 'idle' | 'success' | 'error';

export default function InlineCategorySelect({
  transactionId,
  currentCategoryId,
  categories,
}: InlineCategorySelectProps) {
  const [value, setValue] = useState(currentCategoryId ?? '');
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('perso.compta.inlineEdit');

  function stopRowNavigation(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  function resetFeedbackLater() {
    window.setTimeout(() => setFeedback('idle'), 2000);
  }

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    event.stopPropagation();
    const newValue = event.target.value;
    const previous = value;
    setValue(newValue);
    setFeedback('idle');

    startTransition(async () => {
      const result = await updateTransactionCategory(transactionId, newValue || null);
      if (result.ok) {
        setFeedback('success');
        resetFeedbackLater();
        return;
      }

      setValue(previous);
      setFeedback('error');
      resetFeedbackLater();
    });
  }

  return (
    <div className="flex items-center gap-1" onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="max-w-[160px] border border-gray-300 bg-white px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <option value="">{t('noCategory')}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {isPending ? <span className="text-xs text-gray-400">...</span> : null}
      {feedback === 'success' ? <span className="text-xs text-green-600">✓</span> : null}
      {feedback === 'error' ? <span className="text-xs text-red-600">×</span> : null}
    </div>
  );
}
