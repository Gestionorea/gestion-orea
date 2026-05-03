'use client';

import { useState, useTransition, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { updateTransactionJustification } from '@/app/actions/inline-update-transaction';

type InlineJustificationInputProps = {
  transactionId: string;
  currentJustification: string | null;
};

type Feedback = 'idle' | 'success' | 'error';

export default function InlineJustificationInput({
  transactionId,
  currentJustification,
}: InlineJustificationInputProps) {
  const original = currentJustification ?? '';
  const [value, setValue] = useState(original);
  const [savedValue, setSavedValue] = useState(original.trim());
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('perso.compta.inlineEdit');

  function stopRowNavigation(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  function resetFeedbackLater() {
    window.setTimeout(() => setFeedback('idle'), 2000);
  }

  function handleBlur() {
    const trimmed = value.trim();
    if (trimmed === savedValue) return;

    setFeedback('idle');
    startTransition(async () => {
      const result = await updateTransactionJustification(transactionId, trimmed || null);
      if (result.ok) {
        setSavedValue(trimmed);
        setFeedback('success');
        resetFeedbackLater();
        return;
      }

      setValue(savedValue);
      setFeedback('error');
      resetFeedbackLater();
    });
  }

  return (
    <div className="flex items-center gap-1" onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        placeholder={t('justificationPlaceholder')}
        maxLength={500}
        className="w-full min-w-[120px] max-w-[200px] border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
      />
      {isPending ? <span className="text-xs text-gray-400">...</span> : null}
      {feedback === 'success' ? <span className="text-xs text-green-600">✓</span> : null}
      {feedback === 'error' ? <span className="text-xs text-red-600">×</span> : null}
    </div>
  );
}
