'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-black overflow-hidden">
      {/* Background photo */}
      <Image
        src="/images/hero.webp"
        alt=""
        fill
        className="object-cover"
        priority
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Image
            src="/images/logo.png"
            alt="Gestion ORÉA"
            width={500}
            height={200}
            className="h-auto w-64 sm:w-80 md:w-96 lg:w-[28rem] brightness-0 invert"
            priority
          />
        </motion.div>

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-10 text-[0.65rem] text-center text-white/40 uppercase tracking-[0.4em]"
        >
          {t('eyebrow')}
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-4 text-xs sm:text-sm lg:text-base text-center text-white uppercase tracking-[0.3em]"
        >
          {t('title')} <span className="text-gold">{t('titleHighlight')}</span>
        </motion.h1>

        {/* Institutional sub-text */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-5 max-w-md text-center text-sm leading-relaxed text-white/50"
        >
          {t('institutional')}
        </motion.p>

        {/* Gold line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-10 h-px w-24 bg-gold origin-center"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 max-w-md text-center text-sm leading-relaxed text-white/75 tracking-wide"
        >
          {t('subtitle')}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-10"
        >
          <Link href="/realisations">
            <Button variant="white" size="md">
              {t('cta')}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
