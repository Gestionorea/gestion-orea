'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { LanguageSwitcher } from './LanguageSwitcher';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  { href: '/realisations' as const, key: 'realisations' },
  { href: '/a-propos' as const, key: 'about' },
  { href: '/outils' as const, key: 'tools' },
  { href: '/contact' as const, key: 'contact' },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslations('nav');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-0 top-0 z-50 h-full w-80 bg-white"
          >
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-2.5">
                <div className="w-0.5 h-6 rounded-full bg-gold" />
                <div className="flex flex-col leading-none">
                  <span className="font-serif text-base tracking-[0.15em] text-black">ORÉA</span>
                  <span className="text-[0.45rem] uppercase tracking-[0.35em] text-gray">{t('brandTagline')}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 cursor-pointer"
                aria-label={t('closeMenu')}
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>
            <nav className="px-6 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={onClose}
                  className="block border-b border-gray-light py-5 font-serif text-lg text-black transition-colors hover:text-gray"
                >
                  {t(link.key)}
                </Link>
              ))}
              <div className="mt-8">
                <LanguageSwitcher />
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
