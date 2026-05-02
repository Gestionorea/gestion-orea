import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ContactContent } from '@/components/contact/ContactContent';
import { buildAlternates } from '@/lib/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/contact', locale),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <ContactContent />
    </Suspense>
  );
}
