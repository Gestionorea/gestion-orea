import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { slugifyMerchantName, type TransactionRow } from '@/lib/transactions';

function formatDate(locale: string, date: Date) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function formatMoney(locale: string, amount: string | null) {
  if (!amount) return '-';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(Number(amount));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="font-serif text-xl tracking-[0.06em] text-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">{label}</dt>
      <dd className="mt-2 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default async function TransactionDetail({
  transaction,
  locale,
  canEdit,
  back,
}: {
  transaction: TransactionRow;
  locale: string;
  canEdit: boolean;
  back: string | null;
}) {
  const t = await getTranslations('perso.compta');
  const safeBack = back && back.startsWith('/') && !back.startsWith('//') ? back : null;
  const currentDetailUrl = `/${locale}/perso/comptabilite/${transaction.id}${
    safeBack ? `?back=${encodeURIComponent(safeBack)}` : ''
  }`;
  const merchantHref = `/${locale}/perso/comptabilite/fournisseur/${slugifyMerchantName(
    transaction.merchantName,
  )}?back=${encodeURIComponent(currentDetailUrl)}`;
  const hasJustification = Boolean(transaction.justification?.trim());
  const paymentSource = transaction.paymentSource
    ? `${transaction.paymentSource.name}${transaction.paymentSource.lastDigits ? ` ····${transaction.paymentSource.lastDigits}` : ''}`
    : '-';
  const reimbursementHref =
    transaction.reimbursedAt && transaction.reimbursementTransactionId
      ? `/${locale}/perso/comptabilite/${transaction.reimbursementTransactionId}`
      : null;

  return (
    <div className="py-8">
      <div className="flex flex-col gap-6 border-b border-gray-200 pb-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">
            {t('detail.eyebrow')}
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-[0.06em] text-black">
            {transaction.merchantName}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{formatDate(locale, transaction.date)}</span>
            <span>{t(`types.${transaction.type}`)}</span>
            {transaction.isAdvance && !transaction.reimbursedAt ? (
              <span className="rounded bg-yellow-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-800">
                {t('advance.badge')}
              </span>
            ) : null}
            {transaction.isAdvance && transaction.reimbursedAt ? (
              <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600">
                {t('advance.reimbursed')}
              </span>
            ) : null}
          </div>
        </div>
        <p className="font-serif text-4xl tracking-[0.04em] text-black">
          {formatMoney(locale, transaction.amountTotal)}
        </p>
      </div>

      <div className="mt-8 grid gap-10">
        <Section title={t('detail.sectionFinancials')}>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label={t('detail.fields.amountBeforeTax')} value={formatMoney(locale, transaction.amountBeforeTax)} />
            <DetailRow label={t('detail.fields.tps')} value={formatMoney(locale, transaction.gst)} />
            <DetailRow label={t('detail.fields.tvq')} value={formatMoney(locale, transaction.qst)} />
            <DetailRow label={t('detail.fields.amountTotal')} value={formatMoney(locale, transaction.amountTotal)} />
            <DetailRow label={t('detail.fields.paymentMethod')} value={t(`paymentMethods.${transaction.paymentMethod}`)} />
            <DetailRow label={t('detail.fields.taxRegime')} value={t(`taxRegime.${transaction.taxRegime}`)} />
            <DetailRow label={t('detail.fields.paymentSource')} value={paymentSource} />
          </dl>
        </Section>

        <Section title={t('detail.sectionAllocation')}>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label={t('detail.fields.property')} value={transaction.property?.name ?? '-'} />
            <DetailRow label={t('detail.fields.company')} value={transaction.company?.name ?? '-'} />
            <DetailRow label={t('detail.fields.category')} value={transaction.category?.name ?? '-'} />
            <DetailRow label={t('detail.fields.beneficiary')} value={t(`beneficiaries.${transaction.beneficiary}`)} />
            <DetailRow label={t('detail.fields.invoiceNumber')} value={transaction.invoiceNumber ?? '-'} />
          </dl>
        </Section>

        {hasJustification ? (
          <Section title={t('detail.sectionDescription')}>
            <dl className="grid gap-5">
              <DetailRow
                label={t('detail.fields.justification')}
                value={<span className="whitespace-pre-wrap">{transaction.justification}</span>}
              />
            </dl>
          </Section>
        ) : null}

        <Section title={t('detail.sectionAttachment')}>
          {transaction.attachmentUrl ? (
            <a
              href={transaction.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white"
            >
              {t('detail.openInvoice')}
            </a>
          ) : (
            <p className="text-sm text-gray-500">{t('detail.noInvoice')}</p>
          )}
        </Section>

        {transaction.isAdvance || transaction.reimbursementOf ? (
          <Section title={t('detail.sectionAdvance')}>
            <div className="grid gap-4 text-sm text-gray-900">
              {transaction.isAdvance ? (
                <>
                  <p>
                    {transaction.reimbursedAt
                      ? t('detail.advanceReimbursed', { date: formatDate(locale, transaction.reimbursedAt) })
                      : t('detail.advancePending')}
                  </p>
                  {reimbursementHref ? (
                    <Link href={reimbursementHref} className="w-fit text-sm font-medium text-black underline">
                      {t('detail.viewReimbursementTransaction')}
                    </Link>
                  ) : null}
                </>
              ) : null}
              {transaction.reimbursementOf ? (
                <div className="grid gap-2">
                  <p>{t('detail.advanceReimbursesAdvance')}</p>
                  <Link
                    href={`/${locale}/perso/comptabilite/${transaction.reimbursementOf.id}`}
                    className="w-fit text-sm font-medium text-black underline"
                  >
                    {t('detail.viewAdvanceSource')}
                  </Link>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        <Section title={t('detail.sectionAudit')}>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label={t('detail.audit.createdBy')} value={transaction.createdBy?.username ?? '-'} />
            <DetailRow label={t('detail.audit.createdAt')} value={formatDate(locale, transaction.createdAt)} />
            <DetailRow label={t('detail.audit.updatedAt')} value={formatDate(locale, transaction.updatedAt)} />
            <DetailRow
              label={t('detail.audit.reconciledAt')}
              value={
                transaction.reconciledAt
                  ? `${formatDate(locale, transaction.reconciledAt)} ${
                      transaction.reconciledBy
                        ? t('detail.audit.reconciledBy', { username: transaction.reconciledBy.username })
                        : ''
                    }`
                  : t('detail.audit.notReconciled')
              }
            />
          </dl>
        </Section>

        <Section title={t('detail.sectionLinks')}>
          <Link
            href={merchantHref}
            className="text-sm font-medium text-black underline"
          >
            {t('detail.viewMerchantHistory')}
          </Link>
        </Section>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-8">
          <Link
            href={safeBack ?? `/${locale}/perso/comptabilite`}
            className="inline-flex border border-gray-300 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-black hover:border-black"
          >
            {t('detail.backToList')}
          </Link>
          {canEdit ? (
            <Link
              href={{
                pathname: `/${locale}/perso/comptabilite/${transaction.id}`,
                query: safeBack ? { edit: '1', back: safeBack } : { edit: '1' },
              }}
              className="inline-flex bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white"
            >
              {t('detail.edit')}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
