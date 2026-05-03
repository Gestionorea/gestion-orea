import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { listCompanies } from '@/lib/companies';
import { requireOwner } from '@/lib/permissions';
import { getPropertyById } from '@/lib/properties';
import CoOwnersEditor from './CoOwnersEditor';
import PropertyForm from '../nouveau/Form';

export default async function EditPropertyPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const [t, property, companies] = await Promise.all([getTranslations('perso.admin.properties'), getPropertyById(id), listCompanies()]);
  if (!property) notFound();
  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('editTitle')}</h1>
      <PropertyForm property={property} companies={companies} />
      <CoOwnersEditor
        entityId={property.id}
        entityType="property"
        initialOwners={property.coOwners ?? []}
        companies={companies}
        principalOwnerName={property.company?.name ?? null}
      />
    </div>
  );
}
