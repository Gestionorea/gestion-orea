import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { deletePropertyAction } from '@/app/actions/properties';
import { requireOwner } from '@/lib/permissions';
import { listProperties } from '@/lib/properties';

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const [t, properties] = await Promise.all([getTranslations('perso.admin.properties'), listProperties()]);
  return <div className="py-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p><h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1></div><Link href={`/${locale}/perso/admin/immeubles/nouveau`} className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{t('addButton')}</Link></div><div className="mt-8 divide-y divide-gray-200 border border-gray-200">{properties.map((property) => <div key={property.id} className="flex items-center justify-between gap-4 p-4"><div><div className="font-medium text-black">{property.name}</div><div className="text-sm text-gray-500">{property.company?.name ?? property.address ?? '-'}</div></div><div className="flex gap-4"><Link href={`/${locale}/perso/admin/immeubles/${property.id}`} className="text-sm underline">{t('edit')}</Link><form action={deletePropertyAction}><input type="hidden" name="id" value={property.id} /><button className="text-sm text-red-700">{t('delete')}</button></form></div></div>)}</div></div>;
}
