'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { bulkDeleteByMonth } from '@/app/actions/bulk-delete';
import ConfirmDeleteModal from './ConfirmDeleteModal';

type DeleteMonthButtonProps = {
  year: number;
  month: number;
  monthLabel: string;
  count: number;
};

export default function DeleteMonthButton({ year, month, monthLabel, count }: DeleteMonthButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations('perso.compta.bulkDelete');

  if (count === 0) return null;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('year', String(year));
      formData.append('month', String(month));
      formData.append('confirmation', 'SUPPRIMER');
      const result = await bulkDeleteByMonth(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setShowModal(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 border border-red-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-red-700 hover:border-red-600 hover:bg-red-50"
        title={t('deleteMonthTitle', { month: monthLabel })}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t('deleteMonth')}
      </button>

      <ConfirmDeleteModal
        open={showModal}
        title={t('deleteMonthConfirmTitle', { month: monthLabel })}
        description={error ?? t('deleteMonthConfirmDescription', { month: monthLabel, count })}
        expectedCount={count}
        onConfirm={handleConfirm}
        onCancel={() => {
          setError(null);
          setShowModal(false);
        }}
        pending={isPending}
      />
    </>
  );
}
