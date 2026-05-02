import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth';
import Sidebar from './Sidebar';

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

  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('perso');

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <Sidebar locale={locale} userRole={session.role} />
        <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex justify-end">
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
