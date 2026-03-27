'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import Image from 'next/image';

export function FounderPreview() {
  const t = useTranslations('home.founder');

  return (
    <section className="py-16 lg:py-20 border-t border-gray-light">
      <Container>
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row items-center gap-8 max-w-2xl mx-auto">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
              <Image
                src="/images/team/olivier-2.jpg"
                alt="Olivier Lemieux"
                fill
                className="object-cover object-top grayscale"
                sizes="80px"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm leading-relaxed text-gray">
                {t('text')}
              </p>
              <Link
                href="/a-propos"
                className="mt-2 inline-block text-xs uppercase tracking-widest text-gold hover:text-black transition-colors duration-300"
              >
                {t('link')}
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
