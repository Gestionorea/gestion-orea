import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/permissions';
import TestConnectionButton from './TestConnectionButton';

const CONFIG_KEYS = [
  ['AZURE_TENANT_ID', 'config.tenant'],
  ['AZURE_CLIENT_ID', 'config.client'],
  ['AZURE_CLIENT_SECRET', 'config.secret'],
  ['ONEDRIVE_USER_PRINCIPAL', 'config.user'],
] as const;

export default async function OneDriveAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations('perso.admin.onedrive');

  return (
    <div className="py-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">
          {t('title')}
        </h1>
      </div>

      <section className="mt-8 border border-gray-200 p-5">
        <h2 className="font-serif text-xl tracking-[0.06em] text-black">
          {t('config.title')}
        </h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {CONFIG_KEYS.map(([key, labelKey]) => {
            const present = Boolean(process.env[key]);

            return (
              <div key={key} className="flex items-center justify-between gap-4 border border-gray-100 px-4 py-3 text-sm">
                <dt className="font-medium text-gray-700">{t(labelKey)}</dt>
                <dd className={present ? 'text-green-700' : 'text-red-700'}>
                  <span aria-hidden="true">{present ? '✓' : '×'}</span>{' '}
                  {present ? t('config.present') : t('config.missing')}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="mt-8 border border-gray-200 p-5">
        <h2 className="font-serif text-xl tracking-[0.06em] text-black">
          {t('test.title')}
        </h2>
        <TestConnectionButton locale={locale} />
      </section>
    </div>
  );
}
