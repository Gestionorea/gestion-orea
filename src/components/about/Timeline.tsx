'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

const milestones = [
  { year: '2020', units: 8, cumulative: 8 },
  { year: '2021', units: 25, cumulative: 33 },
  { year: '2022', units: 80, cumulative: 113 },
  { year: '2023', units: 95, cumulative: 208 },
  { year: '2024', units: 125, cumulative: 333 },
  { year: '2025', units: 75, cumulative: 408 },
];

export function Timeline() {
  const t = useTranslations('about.timeline');

  return (
    <section className="bg-black py-14 lg:py-20 overflow-hidden">
      <Container>
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="h-px w-10 bg-gold mx-auto mb-6" />
            <h2 className="font-serif text-2xl font-normal text-white sm:text-3xl">
              {t('title')}
            </h2>
            <p className="mt-3 text-sm text-white/40">
              {t('subtitle')}
            </p>
          </div>
        </AnimatedSection>

        <div className="relative">
          <div className="absolute top-[2.1rem] left-0 right-0 h-px bg-white/5 hidden lg:block" />
          <div className="absolute top-[2.1rem] left-0 right-0 h-px bg-gradient-to-r from-gold/60 via-gold/30 to-gold/10 hidden lg:block" />

          <div className="grid grid-cols-3 gap-6 lg:grid-cols-6">
            {milestones.map((item, index) => {
              const barHeight = Math.max(20, (item.units / 125) * 80);
              return (
                <AnimatedSection key={item.year} delay={index * 0.08}>
                  <div className="group text-center cursor-default">
                    <div className="text-sm text-gold/70 mb-3">
                      {item.year}
                    </div>

                    <div className="mx-auto mb-5 h-2 w-2 rounded-full bg-gold ring-4 ring-gold/10 transition-all duration-300 group-hover:ring-gold/25 group-hover:scale-125" />

                    <div className="mx-auto flex items-end justify-center h-12 mb-3">
                      <div
                        className="w-5 bg-white/5 overflow-hidden transition-all duration-500"
                        style={{ height: `${barHeight}%` }}
                      >
                        <div className="w-full h-full bg-gold translate-y-full transition-transform duration-700 ease-out group-hover:translate-y-0" />
                      </div>
                    </div>

                    {/* Units added */}
                    <div className="font-serif text-xl text-white lg:text-2xl">
                      +{item.units}
                    </div>
                    <div className="text-[0.6rem] uppercase tracking-widest text-white/30 mt-0.5">
                      {t('added')}
                    </div>

                    {/* Cumulative */}
                    <div className="mt-3 font-serif text-sm text-gold/60">
                      {item.cumulative}
                    </div>
                    <div className="text-[0.55rem] uppercase tracking-widest text-white/20">
                      {t('cumulative')}
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
