'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setPaymentSourceOwnersAction } from '@/app/actions/payment-source-owners';
import { setPropertyOwnersAction } from '@/app/actions/property-owners';
import type { CompanyItem } from '@/lib/companies';
import type { CoOwnerListItem } from '@/lib/payment-source-owners';

type EditableOwner = {
  companyId: string;
  percent: string;
};

export default function CoOwnersEditor({
  entityId,
  entityType,
  initialOwners,
  companies,
  principalOwnerName,
}: {
  entityId: string;
  entityType: 'payment-source' | 'property';
  initialOwners: CoOwnerListItem[];
  companies: CompanyItem[];
  principalOwnerName: string | null;
}) {
  const t = useTranslations('perso.admin.coOwners');
  const [owners, setOwners] = useState<EditableOwner[]>(
    initialOwners.map((owner) => ({
      companyId: owner.companyId,
      percent: owner.percent.toFixed(2),
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => owners.reduce((sum, owner) => sum + (Number.isFinite(Number(owner.percent)) ? Number(owner.percent) : 0), 0),
    [owners],
  );
  const isValid = owners.length === 0 || Math.abs(total - 100) <= 0.01;
  const selectedCompanyIds = new Set(owners.map((owner) => owner.companyId).filter(Boolean));
  const availableCompanies = companies.filter((company) => !selectedCompanyIds.has(company.id));

  function updateOwner(index: number, patch: Partial<EditableOwner>) {
    setOwners((current) => current.map((owner, i) => (i === index ? { ...owner, ...patch } : owner)));
  }

  function addOwner() {
    const company = availableCompanies[0];
    if (!company) return;
    setOwners((current) => [...current, { companyId: company.id, percent: '0.00' }]);
  }

  function removeOwner(index: number) {
    setOwners((current) => current.filter((_, i) => i !== index));
  }

  function save() {
    const formData = new FormData();
    formData.set(entityType === 'payment-source' ? 'paymentSourceId' : 'propertyId', entityId);
    formData.set(
      'owners',
      JSON.stringify(
        owners.map((owner) => ({
          companyId: owner.companyId,
          percent: Number(owner.percent),
        })),
      ),
    );

    startTransition(async () => {
      const result =
        entityType === 'payment-source'
          ? await setPaymentSourceOwnersAction(formData)
          : await setPropertyOwnersAction(formData);
      if (!result.ok) {
        setError(result.error);
        setMessage(null);
        return;
      }

      setError(null);
      setMessage(t('saveSuccess'));
    });
  }

  return (
    <section className="mt-10 max-w-3xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-black">{t('title')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={addOwner}
          disabled={availableCompanies.length === 0 || isPending}
          className="border border-gray-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-700 hover:border-black hover:text-black disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {t('add')}
        </button>
      </div>

      {owners.length === 0 ? (
        <p className="mt-5 border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {t('monoOwner', { owner: principalOwnerName ?? t('none') })}
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {owners.map((owner, index) => (
            <div key={`${owner.companyId}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
              <select
                value={owner.companyId}
                onChange={(event) => updateOwner(index, { companyId: event.target.value })}
                className="border border-gray-300 px-3 py-2 text-sm"
              >
                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                    disabled={selectedCompanyIds.has(company.id) && company.id !== owner.companyId}
                  >
                    {company.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <span className="sr-only">{t('percent')}</span>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={owner.percent}
                  onChange={(event) => updateOwner(index, { percent: event.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 text-sm"
                />
                <span className="text-sm text-gray-500">%</span>
              </label>
              <button
                type="button"
                onClick={() => removeOwner(index)}
                className="border border-gray-300 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-700 hover:border-red-700 hover:text-red-700"
              >
                {t('remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`mt-5 border px-4 py-3 text-sm ${
          isValid ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'
        }`}
      >
        {t('sumStatus', { total: total.toFixed(2) })}
      </div>
      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={!isValid || isPending}
        className="mt-5 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isPending ? t('saving') : t('save')}
      </button>
    </section>
  );
}
