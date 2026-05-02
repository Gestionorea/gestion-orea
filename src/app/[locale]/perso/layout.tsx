import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth';

export const metadata = { robots: { index: false, follow: false } };

export default async function PersoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'fr' | 'en')) {
    redirect(`/${routing.defaultLocale}/login`);
  }

  setRequestLocale(locale);

  if (!(await getSession())) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('perso');
  const homeHref = `/${locale}/perso`;
  const passwordHref = `/${locale}/perso/admin/mot-de-passe`;
  const usersHref = `/${locale}/perso/admin/utilisateurs`;
  const renderNavItems = () => (
    <nav className="mt-8 space-y-8">
      <div>
        <Link
          href={homeHref}
          className="block text-sm font-medium text-black transition hover:text-gray-600"
        >
          {t('nav.home')}
        </Link>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
          {t('nav.admin')}
        </div>
        <div className="mt-4 space-y-3">
          <Link
            href={passwordHref}
            className="block text-sm text-black transition hover:text-gray-600"
          >
            {t('nav.password')}
          </Link>
          <Link
            href={usersHref}
            className="block text-sm text-black transition hover:text-gray-600"
          >
            {t('nav.users')}
          </Link>
          <span
            className="pointer-events-none block text-sm text-gray-400"
            aria-disabled="true"
          >
            {t('nav.permissions')}
          </span>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 lg:flex-row lg:gap-12 lg:px-8">
        <aside className="border-b border-gray-200 pb-6 lg:w-64 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 h-1 w-8 rounded-full bg-gold" />
              <div className="font-serif text-xl tracking-wide text-black">ORÉA</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                {t('headerLabel')}
              </div>
            </div>
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="border border-gray-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-black transition hover:border-black"
              >
                {t('logout')}
              </button>
            </form>
          </div>
          <details className="mt-6 lg:hidden">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
              {t('nav.menu')}
            </summary>
            {renderNavItems()}
          </details>
          <div className="hidden lg:block">{renderNavItems()}</div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
