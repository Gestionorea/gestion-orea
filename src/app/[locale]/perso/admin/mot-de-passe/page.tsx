import { getTranslations, setRequestLocale } from 'next-intl/server';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.password');

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
        {t('eyebrow')}
      </p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-gray-500">{t('subtitle')}</p>
      <ChangePasswordForm />
    </div>
  );
}
