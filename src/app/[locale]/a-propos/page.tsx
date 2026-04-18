import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { values, team } from '@/lib/data';
import { Timeline } from '@/components/about/Timeline';
import Image from 'next/image';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <>
      {/* Header — ORÉA first */}
      <section className="bg-black pt-32 pb-12">
        <Container>
          <AnimatedSection>
            <SectionHeading
              title={t('header.title')}
              subtitle={t('header.subtitle')}
              light
            />
          </AnimatedSection>
        </Container>
      </section>

      {/* Founder */}
      <section className="py-24 lg:py-40">
        <Container>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <AnimatedSection>
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src="/images/team/olivier-1.png"
                  alt={team[0].name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="h-px w-12 bg-gold mb-8" />
              <h2 className="font-serif text-3xl font-normal text-black sm:text-4xl">
                {t('team.title')}
              </h2>
              <h3 className="mt-2 text-sm uppercase tracking-widest text-gray">
                {team[0].name} — {team[0].role[locale as 'fr' | 'en']}
              </h3>
              <p className="mt-8 text-base leading-relaxed text-gray">
                {t('team.bio1')}
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray">
                {t('team.bio2')}
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray">
                {t('team.bio3')}
              </p>
              <p className="mt-4 text-base leading-relaxed text-black font-medium italic">
                {t('team.bio4')}
              </p>
            </AnimatedSection>
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <Timeline />

      {/* Mission */}
      <section className="bg-white py-12 lg:py-16">
        <Container>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <AnimatedSection>
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="/images/portfolio/11-unites-granby.png"
                  alt={t('buildingAlt')}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="h-px w-12 bg-gold mb-8" />
              <h2 className="font-serif text-3xl font-normal text-black sm:text-4xl">
                {t('mission.title')}
              </h2>
              <p className="mt-6 font-serif text-xl leading-relaxed text-black sm:text-2xl">
                {t('mission.text')}
              </p>
              <p className="mt-6 text-base leading-relaxed text-gray">
                {t('mission.text2')}
              </p>
            </AnimatedSection>
          </div>
        </Container>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-gray-light py-16 lg:py-20">
        <Container>
          <AnimatedSection>
            <div className="text-center mb-12">
              <div className="h-px w-10 bg-gold mx-auto mb-6" />
              <h2 className="font-serif text-2xl font-normal text-black sm:text-3xl">
                {t('ecosystem.title')}
              </h2>
              <p className="mt-3 max-w-xl mx-auto text-sm text-gray leading-relaxed">
                {t('ecosystem.subtitle')}
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-20">
              <a
                href="https://www.siagi.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 hover:scale-110"
              >
                <Image
                  src="/images/partners/sia.png"
                  alt="SIA Gestion Immobilière"
                  width={80}
                  height={30}
                  className="h-8 w-auto"
                />
              </a>
              <a
                href="https://biasafe.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 hover:scale-110"
              >
                <Image
                  src="/images/partners/biasafe.png"
                  alt="Biasafe"
                  width={80}
                  height={30}
                  className="h-8 w-auto"
                />
              </a>
              <a
                href="https://www.gtrsantesherbrooke.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 hover:scale-110"
              >
                <Image
                  src="/images/partners/gtr.png"
                  alt="GTR Santé Sherbrooke"
                  width={80}
                  height={30}
                  className="h-7 w-auto"
                />
              </a>
            </div>
          </AnimatedSection>
        </Container>
      </section>

      {/* Podcasts */}
      <section className="bg-black py-16 lg:py-20">
        <Container>
          <AnimatedSection>
            <div className="text-center mb-12">
              <div className="h-px w-10 bg-gold mx-auto mb-6" />
              <h2 className="font-serif text-2xl font-normal text-white sm:text-3xl">
                {t('media.title')}
              </h2>
              <p className="mt-3 text-sm text-white/50">
                {t('media.subtitle')}
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="relative aspect-video overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/i0slI9H73j8"
                  title="Podcast ORÉA 1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <div className="relative aspect-video overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/aU0jLsbolUA"
                  title="Podcast ORÉA 2"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </AnimatedSection>
        </Container>
      </section>
    </>
  );
}
