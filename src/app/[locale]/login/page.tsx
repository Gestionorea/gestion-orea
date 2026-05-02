import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'OREA', robots: { index: false, follow: false } };

function getPrivatePath(locale: string): string {
  return locale === 'en' ? `/${locale}/private` : `/${locale}/perso`;
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'fr' | 'en')) {
    redirect(`/${routing.defaultLocale}/login`);
  }

  setRequestLocale(locale);

  if (await getSession()) {
    redirect(getPrivatePath(locale));
  }

  const t = await getTranslations('login');
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-24">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-gold" />
          <h1 className="font-serif text-3xl tracking-[0.15em] text-black">ORÉA</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <LoginForm locale={locale} from={typeof sp.from === 'string' ? sp.from : ''} />
      </div>
    </div>
  );
}
