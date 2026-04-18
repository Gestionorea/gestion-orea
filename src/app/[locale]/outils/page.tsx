import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { SCHLCalculator } from '@/components/tools/SCHLCalculator';
import { Mail } from 'lucide-react';
import { buildAlternates } from '@/lib/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/outils'),
  };
}

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('tools');

  return (
    <>
      <section className="bg-black pt-32 pb-12">
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

      <section className="py-16 lg:py-24">
        <Container>
          <AnimatedSection>
            <SCHLCalculator />
          </AnimatedSection>
        </Container>
      </section>

      <section className="bg-black py-16 lg:py-20">
        <Container>
          <AnimatedSection>
            <div className="mx-auto max-w-2xl text-center">
              <div className="h-px w-10 bg-gold mx-auto mb-8" />
              <h2 className="font-serif text-2xl font-normal text-white sm:text-3xl">
                {t('calculator.cta.title')}
              </h2>
              <p className="mt-4 text-sm text-white/50">
                {t('calculator.cta.text')}
              </p>
              <div className="mt-8">
                <a href={`mailto:olemieux@oreaholding.ca?subject=${encodeURIComponent('Soumission immeuble — ORÉA')}`}>
                  <Button variant="white" size="md">
                    <Mail className="mr-2 h-4 w-4" />
                    {t('calculator.cta.button')}
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
