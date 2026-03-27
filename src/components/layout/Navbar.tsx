'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { clsx } from 'clsx';
import Image from 'next/image';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

const navLinks = [
  { href: '/realisations' as const, key: 'realisations' },
  { href: '/a-propos' as const, key: 'about' },
  { href: '/outils' as const, key: 'tools' },
  { href: '/contact' as const, key: 'contact' },
];

export function Navbar() {
  const t = useTranslations('nav');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-30 transition-all duration-500',
          isScrolled
            ? 'bg-white/95 backdrop-blur-sm border-b border-gray-light'
            : 'bg-transparent'
        )}
      >
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          {/* Top row: logo left, language right */}
          <div className="flex items-center justify-between md:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gold" />
              <div className="flex flex-col leading-none">
                <span className={clsx(
                  'font-serif text-xl tracking-[0.15em] transition-all duration-500',
                  isScrolled ? 'text-black' : 'text-white'
                )}>ORÉA</span>
                <span className={clsx(
                  'text-[0.55rem] uppercase tracking-[0.35em] transition-all duration-500',
                  isScrolled ? 'text-gray' : 'text-white/50'
                )}>{t('brandTagline')}</span>
              </div>
            </Link>
            <button
              className="p-2 cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className={clsx('h-5 w-5 transition-colors duration-300', isScrolled ? 'text-black' : 'text-white')} />
            </button>
          </div>

          {/* Desktop: logo left, nav centered, language right */}
          <div className="hidden md:grid md:grid-cols-3 md:items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gold" />
              <div className="flex flex-col leading-none">
                <span className={clsx(
                  'font-serif text-xl tracking-[0.15em] transition-all duration-500',
                  isScrolled ? 'text-black' : 'text-white'
                )}>ORÉA</span>
                <span className={clsx(
                  'text-[0.55rem] uppercase tracking-[0.35em] transition-all duration-500',
                  isScrolled ? 'text-gray' : 'text-white/50'
                )}>{t('brandTagline')}</span>
              </div>
            </Link>

            <nav className="flex items-center justify-center gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={clsx(
                    'font-serif text-sm tracking-wide transition-all duration-300 hover:text-gray',
                    isScrolled ? 'text-black' : 'text-white'
                  )}
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center justify-end">
              <LanguageSwitcher isScrolled={isScrolled} />
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
