import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { deleteCompanyAction } from '@/app/actions/companies';
import { listCompanies } from '@/lib/companies';
import { requireOwner } from '@/lib/permissions';

export default async function CompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const [t, companies] = await Promise.all([getTranslations('perso.admin.companies'), listCompanies()]);
  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p><h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1></div>
        <Link href={`/${locale}/perso/admin/compagnies/nouveau`} className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{t('addButton')}</Link>
      </div>
      <div className="mt-8 divide-y divide-gray-200 border border-gray-200">
        {companies.map((company) => (
          <div key={company.id} className="flex items-center justify-between gap-4 p-4">
            <span className="font-medium text-black">{company.name}</span>
            <div className="flex gap-4">
              <Link href={`/${locale}/perso/admin/compagnies/${company.id}`} className="text-sm underline">{t('edit')}</Link>
              <form action={deleteCompanyAction}><input type="hidden" name="id" value={company.id} /><button className="text-sm text-red-700">{t('delete')}</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
