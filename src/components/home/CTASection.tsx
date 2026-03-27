'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Mail, Phone } from 'lucide-react';

export function CTASection() {
  const t = useTranslations('home.cta');

  return (
    <section className="py-24 lg:py-40">
      <Container>
        <AnimatedSection>
          <div className="text-center">
            <div className="h-px w-12 bg-gold mx-auto mb-8" />
            <h2 className="font-serif text-3xl font-normal text-black sm:text-4xl lg:text-5xl">
              {t('title')}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-gray">
              {t('subtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray">
              <a href="mailto:olemieux@levicapital.ca" className="flex items-center gap-2 transition-colors duration-300 hover:text-black">
                <Mail className="h-4 w-4" />
                olemieux@levicapital.ca
              </a>
              <span className="hidden sm:block h-px w-6 bg-gray-light" />
              <a href="tel:5148765276" className="flex items-center gap-2 transition-colors duration-300 hover:text-black">
                <Phone className="h-4 w-4" />
                (514) 876-5276
              </a>
            </div>
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg">
                  {t('button')}
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
