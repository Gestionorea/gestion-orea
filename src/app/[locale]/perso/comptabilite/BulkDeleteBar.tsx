'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { bulkDeleteByIds } from '@/app/actions/bulk-delete';
import ConfirmDeleteModal from './ConfirmDeleteModal';

type BulkDeleteBarProps = {
  selectedIds: string[];
  onDeleted: () => void;
};

export default function BulkDeleteBar({ selectedIds, onDeleted }: BulkDeleteBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('perso.compta.bulkDelete');

  if (selectedIds.length === 0) return null;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('transactionIds', JSON.stringify(selectedIds));
      formData.append('confirmation', 'SUPPRIMER');
      const result = await bulkDeleteByIds(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setShowModal(false);
      onDeleted();
    });
  }

  return (
    <>
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border border-red-300 bg-red-50 px-4 py-3">
        <span className="text-sm font-medium text-red-900">
          {t('selectedCount', { count: selectedIds.length })}
        </span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-red-600 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-red-700"
        >
          {t('deleteSelected', { count: selectedIds.length })}
        </button>
      </div>

      <ConfirmDeleteModal
        open={showModal}
        title={t('confirmTitle')}
        description={error ?? t('confirmDescription')}
        expectedCount={selectedIds.length}
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
