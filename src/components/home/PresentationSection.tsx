'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { values } from '@/lib/data';
import Image from 'next/image';

export function PresentationSection() {
  const t = useTranslations('home.presentation');
  const tMission = useTranslations('about.mission');
  const tValues = useTranslations('about.values');

  return (
    <>
      {/* ── Vision + Mission ── photo left, text right */}
      <section className="bg-white py-24 lg:py-40">
        <Container>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <AnimatedSection>
              <div>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src="/images/team/olivier-2.jpg"
                    alt="Olivier Lemieux"
                    fill
                    className="object-cover object-top grayscale"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </AnimatedSection>

            <div className="space-y-20">
              {/* Vision */}
              <AnimatedSection delay={0.2}>
                <div className="h-px w-12 bg-gold mb-8" />
                <h2 className="font-serif text-3xl font-normal text-black sm:text-4xl">
                  {t('title')}
                </h2>
                <p className="mt-6 font-serif text-xl leading-relaxed text-black sm:text-2xl">
                  {t('text')}
                </p>
                <p className="mt-6 text-base leading-relaxed text-gray">
                  {t('text2')}
                </p>
              </AnimatedSection>

              {/* Mission */}
              <AnimatedSection>
                <div className="h-px w-12 bg-gold mb-8" />
                <h2 className="font-serif text-3xl font-normal text-black sm:text-4xl">
                  {tMission('title')}
                </h2>
                <p className="mt-6 font-serif text-xl leading-relaxed text-black sm:text-2xl">
                  {tMission('text')}
                </p>
                <p className="mt-6 text-base leading-relaxed text-gray">
                  {tMission('text2')}
                </p>
              </AnimatedSection>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Valeurs ── fond noir, pleine largeur, en ligne */}
      <section className="bg-black py-16 lg:py-20">
        <Container>
          <AnimatedSection>
            <div className="text-center mb-10">
              <div className="h-px w-12 bg-gold mx-auto mb-8" />
              <h2 className="font-serif text-3xl font-normal text-white sm:text-4xl">
                {tValues('title')}
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {values.map((value, index) => {
              return (
                <AnimatedSection key={value.key} delay={index * 0.1}>
                  <div className="group cursor-default px-8 py-4 transition-all duration-500 hover:bg-white/[0.03]">
                    <div className="h-px w-8 bg-gold mb-5" />
                    <h3 className="font-serif text-lg text-white transition-colors duration-500 group-hover:text-gold">
                      {tValues(`${value.key}.title`)}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/50 transition-colors duration-500 group-hover:text-white/70">
                      {tValues(`${value.key}.description`)}
                    </p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
