'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Mail } from 'lucide-react';

export function BrokerSection() {
  const t = useTranslations('home.broker');

  const mailtoHref = `mailto:olemieux@levicapital.ca?subject=${encodeURIComponent('Soumission immeuble — ORÉA')}`;

  return (
    <section className="bg-black py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <AnimatedSection>
            <div className="h-px w-10 bg-gold mx-auto mb-8" />
            <h2 className="font-serif text-2xl font-normal text-white sm:text-3xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-xl mx-auto">
              {t('text')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gold/80 uppercase tracking-widest">
              {[0, 1, 2, 3].map((i) => (
                <span key={i}>{t(`criteria.${i}`)}</span>
              ))}
            </div>
            <div className="mt-8">
              <a href={mailtoHref}>
                <Button variant="white" size="md">
                  <Mail className="mr-2 h-4 w-4" />
                  {t('cta')}
                </Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-white/30">{t('speed')}</p>
          </AnimatedSection>
        </div>
      </Container>
    </section>
  );
}
