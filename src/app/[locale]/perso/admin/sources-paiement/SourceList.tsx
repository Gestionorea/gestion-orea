import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { archivePaymentSourceAction } from '@/app/actions/paymentSources';
import type { PaymentSourceItem } from '@/lib/paymentSources';

export default async function SourceList({
  sources,
  locale,
  archived,
}: {
  sources: PaymentSourceItem[];
  locale: string;
  archived: boolean;
}) {
  const t = await getTranslations('perso.admin.paymentSources');

  return (
    <div className="mt-8 overflow-x-auto border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('fields.name')}</th>
            <th className="px-4 py-3 font-medium">{t('fields.kind')}</th>
            <th className="px-4 py-3 font-medium">{t('fields.owner')}</th>
            <th className="px-4 py-3 font-medium">{t('fields.lastDigits')}</th>
            <th className="px-4 py-3 font-medium">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sources.map((source) => (
            <tr key={source.id}>
              <td className="px-4 py-4 font-medium text-black">
                {source.name}
                {source.isPersonal ? (
                  <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-800">
                    {t('personalBadge')}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-gray-600">{t(`kinds.${source.kind}`)}</td>
              <td className="px-4 py-4 text-gray-600">{source.ownerCompany?.name ?? '-'}</td>
              <td className="px-4 py-4 text-gray-600">{source.lastDigits ? `····${source.lastDigits}` : '-'}</td>
              <td className="px-4 py-4">
                <div className="flex gap-4">
                  <Link href={`/${locale}/perso/admin/sources-paiement/${source.id}`} className="text-sm underline">
                    {t('edit')}
                  </Link>
                  {!archived ? (
                    <form action={archivePaymentSourceAction}>
                      <input type="hidden" name="id" value={source.id} />
                      <button className="text-sm text-red-700">{t('archive')}</button>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
