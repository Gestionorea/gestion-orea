import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-black text-white">
      <Container className="py-20">
        <div className="grid gap-16 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gold" />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl tracking-[0.15em] text-white">ORÉA</span>
                <span className="text-[0.55rem] uppercase tracking-[0.35em] text-white/50">{t('nav.brandTagline')}</span>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-white/50">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm tracking-wide text-white/60">
              {t('footer.quickLinks')}
            </h3>
            <nav className="mt-6 flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm text-white/50 transition-colors duration-300 hover:text-white"
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/realisations"
                className="text-sm text-white/50 transition-colors duration-300 hover:text-white"
              >
                {t('nav.realisations')}
              </Link>
              <Link
                href="/a-propos"
                className="text-sm text-white/50 transition-colors duration-300 hover:text-white"
              >
                {t('nav.about')}
              </Link>
              <Link
                href="/outils"
                className="text-sm text-white/50 transition-colors duration-300 hover:text-white"
              >
                {t('nav.tools')}
              </Link>
              <Link
                href="/contact"
                className="text-sm text-white/50 transition-colors duration-300 hover:text-white"
              >
                {t('nav.contact')}
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="font-serif text-sm tracking-wide text-white/60">
              {t('footer.contact')}
            </h3>
            <div className="mt-6 flex flex-col gap-4 text-sm text-white/50">
              <p>{t('contact.info.address')}</p>
              <p>{t('contact.info.email')}</p>
              <p>{t('contact.info.phone')}</p>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Gestion ORÉA. {t('footer.rights')}
        </div>
      </Container>
    </footer>
  );
}
