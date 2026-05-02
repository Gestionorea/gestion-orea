import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/permissions';
import CategoryForm from './Form';

export default async function NewCategoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations('perso.admin.categories');
  return <div className="py-8"><p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p><h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('newTitle')}</h1><CategoryForm /></div>;
}
