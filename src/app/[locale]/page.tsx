import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustBand } from '@/components/home/TrustBand';
import { BrokerSection } from '@/components/home/BrokerSection';
import { PresentationSection } from '@/components/home/PresentationSection';
import { FounderPreview } from '@/components/home/FounderPreview';
import { AudienceSection } from '@/components/home/AudienceSection';
import { BuildingsPreview } from '@/components/home/BuildingsPreview';
import { StatsCounter } from '@/components/home/StatsCounter';
import { CTASection } from '@/components/home/CTASection';
import { buildAlternates } from '@/lib/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/'),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <TrustBand />
      <BrokerSection />
      <PresentationSection />
      <FounderPreview />
      <AudienceSection />
      <BuildingsPreview />
      <StatsCounter />
      <CTASection />
    </>
  );
}
