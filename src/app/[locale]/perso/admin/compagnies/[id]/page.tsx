import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getCompanyById } from '@/lib/companies';
import { requireOwner } from '@/lib/permissions';
import CompanyForm from '../nouveau/Form';

export default async function EditCompanyPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const [t, company] = await Promise.all([getTranslations('perso.admin.companies'), getCompanyById(id)]);
  if (!company) notFound();
  return <div className="py-8"><p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p><h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('editTitle')}</h1><CompanyForm company={company} /></div>;
}
