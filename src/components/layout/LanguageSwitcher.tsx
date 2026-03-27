'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { clsx } from 'clsx';

interface LanguageSwitcherProps {
  isScrolled?: boolean;
}

export function LanguageSwitcher({ isScrolled = true }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === 'fr' ? 'en' : 'fr';

  const handleSwitch = () => {
    router.replace(pathname, { locale: otherLocale });
  };

  return (
    <button
      onClick={handleSwitch}
      className={clsx(
        'text-xs font-sans uppercase tracking-widest transition-all duration-300 hover:text-gray cursor-pointer',
        isScrolled ? 'text-black' : 'text-white'
      )}
      aria-label={`Switch to ${otherLocale === 'fr' ? 'French' : 'English'}`}
    >
      {otherLocale.toUpperCase()}
    </button>
  );
}
