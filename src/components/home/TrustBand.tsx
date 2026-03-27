'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export function TrustBand() {
  const t = useTranslations('home.trust');

  const items = [
    { key: 'focus' },
    { key: 'markets' },
    { key: 'operations' },
    { key: 'strategy' },
  ];

  return (
    <section className="border-t border-b border-gray-light py-10 lg:py-14">
      <Container>
        <AnimatedSection>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:divide-x lg:divide-gray-light">
            {items.map((item) => (
              <div key={item.key} className="text-center px-4">
                <p className="font-serif text-base text-black lg:text-lg">
                  {t(`${item.key}.title`)}
                </p>
                <p className="mt-1.5 text-xs text-gray leading-relaxed">
                  {t(`${item.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
