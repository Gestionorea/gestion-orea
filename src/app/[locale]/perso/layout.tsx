import { getTranslations, setRequestLocale } from 'next-intl/server';
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-gray-200 pb-5">
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
      </header>
      {children}
    </div>
  );
}
