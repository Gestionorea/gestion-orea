'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  description: string;
  expectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
};

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  expectedCount,
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState('');
  const t = useTranslations('perso.compta.bulkDelete');

  if (!open) return null;

  const canConfirm = typed === 'SUPPRIMER' && !pending;
  const handleCancel = () => {
    setTyped('');
    onCancel();
  };
  const handleConfirm = () => {
    setTyped('');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCancel}>
      <div
        className="w-full max-w-md border-2 border-red-500 bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-serif text-xl text-red-700">{title}</h2>
        <p className="mt-3 text-sm text-gray-700">{description}</p>
        <p className="mt-4 text-sm font-medium text-black">{t('expectedCount', { count: expectedCount })}</p>
        <p className="mt-4 text-xs text-gray-600">{t('typeToConfirm')}</p>
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="SUPPRIMER"
          className="mt-2 w-full border border-gray-300 px-3 py-2 font-mono text-sm"
          autoFocus
        />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={handleCancel} className="border border-gray-300 px-4 py-2 text-sm">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-red-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {pending ? t('deleting') : t('confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}
