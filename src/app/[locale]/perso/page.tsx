import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function PersoHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('perso');

  return (
    <div className="py-16 text-center">
      <h1 className="font-serif text-3xl tracking-[0.1em] text-black">{t('title')}</h1>
      <p className="mt-4 text-sm text-gray-500">{t('subtitle')}</p>
    </div>
  );
}
