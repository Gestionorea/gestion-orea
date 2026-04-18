import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { buildings } from '@/lib/data';
import { Button } from '@/components/ui/Button';
import { Mail } from 'lucide-react';
import Image from 'next/image';
import { buildAlternates } from '@/lib/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'realisations.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/realisations'),
  };
}

function BuildingCard({
  building,
  title,
  description,
  sizes,
  aspect = 'aspect-[16/10]',
}: {
  building: (typeof buildings)[number];
  title: string;
  description: string;
  sizes: string;
  aspect?: string;
}) {
  return (
    <div className="group relative overflow-hidden cursor-pointer">
      <div className={`relative ${aspect}`}>
        <Image
          src={building.image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={sizes}
        />
        {/* Gradient + title always visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent transition-all duration-500 group-hover:from-black/80" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-serif text-lg text-white">{title}</h3>
          {/* Description appears on hover */}
          <p className="mt-1 text-sm text-white/70 max-h-0 overflow-hidden opacity-0 transition-all duration-500 group-hover:max-h-20 group-hover:opacity-100">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function RealisationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('realisations');

  return (
    <>
      {/* Header */}
      <section className="bg-black pt-32 pb-20">
        <Container>
          <AnimatedSection>
            <SectionHeading
              title={t('title')}
              subtitle={t('subtitle')}
              light
            />
          </AnimatedSection>
        </Container>
      </section>

      {/* Buildings — full width mosaic */}
      <section className="py-16 lg:py-24">
        <Container>
          {/* First row: 1 large + 1 medium */}
          <div className="grid gap-4 md:grid-cols-5">
            {buildings[0] && (
              <AnimatedSection className="md:col-span-3">
                <BuildingCard
                  building={buildings[0]}
                  title={t(`buildings.${buildings[0].key}.title`)}
                  description={t(`buildings.${buildings[0].key}.description`)}
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              </AnimatedSection>
            )}
            {buildings[1] && (
              <AnimatedSection delay={0.1} className="md:col-span-2">
                <BuildingCard
                  building={buildings[1]}
                  title={t(`buildings.${buildings[1].key}.title`)}
                  description={t(`buildings.${buildings[1].key}.description`)}
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </AnimatedSection>
            )}
          </div>

          {/* Second row: 1 medium + 1 large */}
          <div className="grid gap-4 md:grid-cols-5 mt-4">
            {buildings[2] && (
              <AnimatedSection className="md:col-span-2">
                <BuildingCard
                  building={buildings[2]}
                  title={t(`buildings.${buildings[2].key}.title`)}
                  description={t(`buildings.${buildings[2].key}.description`)}
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </AnimatedSection>
            )}
            {buildings[3] && (
              <AnimatedSection delay={0.1} className="md:col-span-3">
                <BuildingCard
                  building={buildings[3]}
                  title={t(`buildings.${buildings[3].key}.title`)}
                  description={t(`buildings.${buildings[3].key}.description`)}
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              </AnimatedSection>
            )}
          </div>

          {/* Third row: 3 equal */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            {buildings.slice(4).map((building, index) => (
              <AnimatedSection key={building.id} delay={index * 0.1}>
                <BuildingCard
                  building={building}
                  title={t(`buildings.${building.key}.title`)}
                  description={t(`buildings.${building.key}.description`)}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  aspect="aspect-[4/3]"
                />
              </AnimatedSection>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-black py-16 lg:py-20">
        <Container>
          <AnimatedSection>
            <div className="mx-auto max-w-2xl text-center">
              <div className="h-px w-10 bg-gold mx-auto mb-8" />
              <h2 className="font-serif text-2xl font-normal text-white sm:text-3xl">
                {t('cta.title')}
              </h2>
              <p className="mt-4 text-sm text-white/50">
                {t('cta.text')}
              </p>
              <div className="mt-8">
                <a href={`mailto:olemieux@oreaholding.ca?subject=${encodeURIComponent('Soumission immeuble — ORÉA')}`}>
                  <Button variant="white" size="md">
                    <Mail className="mr-2 h-4 w-4" />
                    {t('cta.button')}
                  </Button>
                </a>
              </div>
            </div>
          </AnimatedSection>
        </Container>
      </section>
    </>
  );
}
