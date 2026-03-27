'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';

export function AudienceSection() {
  const t = useTranslations('home.audience');
  const locale = useLocale();

  return (
    <section className="py-24 lg:py-32">
      <Container>
        <AnimatedSection>
          <div className="text-center mb-6">
            <div className="h-px w-10 bg-gold mx-auto mb-6" />
            <h2 className="font-serif text-2xl font-normal text-black sm:text-3xl">
              {t('title')}
            </h2>
          </div>
          <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-gray mb-14">
            {t('intro')}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Lenders */}
          <AnimatedSection delay={0.1}>
            <div className="border border-gray-light p-10 lg:p-12 flex flex-col h-full">
              <h3 className="font-serif text-xl text-black">
                {t('lenders.title')}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                {t('lenders.text')}
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-black">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gold shrink-0" />
                    {t(`lenders.points.${i}`)}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <a href={`/${locale}/contact?type=financement`}>
                  <Button variant="outline" size="sm">
                    {t('lenders.cta')}
                  </Button>
                </a>
              </div>
            </div>
          </AnimatedSection>

          {/* Partners */}
          <AnimatedSection delay={0.2}>
            <div className="border border-gray-light p-10 lg:p-12 flex flex-col h-full">
              <h3 className="font-serif text-xl text-black">
                {t('partners.title')}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                {t('partners.text')}
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-black">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gold shrink-0" />
                    {t(`partners.points.${i}`)}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <a href={`/${locale}/contact?type=partenariat`}>
                  <Button variant="outline" size="sm">
                    {t('partners.cta')}
                  </Button>
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </Container>
    </section>
  );
}
