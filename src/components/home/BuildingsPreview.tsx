'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { buildings } from '@/lib/data';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

export function BuildingsPreview() {
  const t = useTranslations('home.buildings');
  const tBuildings = useTranslations('realisations');
  const [isPaused, setIsPaused] = useState(false);

  const loopBuildings = [...buildings, ...buildings];

  // Total width: each card is ~500px + 24px gap
  const cardWidth = 504;
  const totalWidth = buildings.length * cardWidth;

  return (
    <section className="py-24 lg:py-40">
      <Container>
        <AnimatedSection>
          <SectionHeading title={t('title')} subtitle={t('subtitle')} />
        </AnimatedSection>
      </Container>

      <div
        className="relative mt-12 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex gap-6"
          animate={{ x: isPaused ? undefined : -totalWidth }}
          transition={{
            x: {
              duration: 30,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
            },
          }}
          style={{ width: totalWidth * 2 }}
        >
          {loopBuildings.map((building, index) => (
            <div
              key={`${building.id}-${index}`}
              className="group flex-shrink-0 w-[320px] sm:w-[400px] lg:w-[480px]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={building.image}
                  alt={tBuildings(`buildings.${building.key}.title`)}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
                  <h3 className="font-serif text-base text-white drop-shadow-sm">
                    {tBuildings(`buildings.${building.key}.title`)}
                  </h3>
                  <p className="mt-2 text-[0.65rem] text-gold uppercase tracking-[0.2em] drop-shadow-sm">
                    {building.tag}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <Container>
        <AnimatedSection delay={0.4}>
          <div className="mt-16 text-center">
            <Link href="/realisations">
              <Button variant="outline">
                {t('viewAll')}
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
