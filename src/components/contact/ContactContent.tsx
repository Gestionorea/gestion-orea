'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { ContactTabs } from './ContactTabs';
import { Mail, Phone, MapPin } from 'lucide-react';

const variants: Record<string, { titleKey: string; textKey: string }> = {
  financement: { titleKey: 'types.financement.title', textKey: 'types.financement.text' },
  partenariat: { titleKey: 'types.partenariat.title', textKey: 'types.partenariat.text' },
};

export function ContactContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const t = useTranslations('contact');

  const variant = type && variants[type] ? variants[type] : null;
  const headerTitle = variant ? t(variant.titleKey) : t('title');
  const headerSubtitle = variant ? t(variant.textKey) : t('subtitle');

  return (
    <>
      {/* Header */}
      <section className="bg-black pt-32 pb-12">
        <Container>
          <AnimatedSection>
            <SectionHeading
              title={headerTitle}
              subtitle={headerSubtitle}
              light
            />
          </AnimatedSection>
        </Container>
      </section>

      {/* Form */}
      <section className="py-16 lg:py-24">
        <Container>
          <ContactTabs />
        </Container>
      </section>

      {/* Direct contact */}
      <section className="border-t border-gray-light py-12">
        <Container>
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
              <a
                href="mailto:olemieux@levicapital.ca"
                className="flex items-center gap-3 text-sm text-gray transition-colors duration-300 hover:text-black"
              >
                <Mail className="h-4 w-4" />
                {t('info.email')}
              </a>
              <a
                href="tel:5148765276"
                className="flex items-center gap-3 text-sm text-gray transition-colors duration-300 hover:text-black"
              >
                <Phone className="h-4 w-4" />
                {t('info.phone')}
              </a>
              <span className="flex items-center gap-3 text-sm text-gray">
                <MapPin className="h-4 w-4" />
                {t('info.address')}
              </span>
            </div>
          </AnimatedSection>
        </Container>
      </section>
    </>
  );
}
