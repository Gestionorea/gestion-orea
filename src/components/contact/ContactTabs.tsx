'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { submitContactForm, type ContactType } from '@/app/actions/contact';
import { Mail, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

const tabs: { key: ContactType; labelKey: string }[] = [
  { key: 'broker', labelKey: 'tabs.broker' },
  { key: 'lender', labelKey: 'tabs.lender' },
  { key: 'partner', labelKey: 'tabs.partner' },
];

const typeMap: Record<string, ContactType> = {
  broker: 'broker',
  lender: 'lender',
  partner: 'partner',
  financement: 'lender',
  partenariat: 'partner',
  financing: 'lender',
  partnership: 'partner',
};

const inputClasses =
  'w-full border-b border-gray-light bg-transparent py-3 text-sm text-black outline-none transition-all placeholder:text-gray/30 focus:border-black';

export function ContactTabs() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const initialTab = typeParam && typeMap[typeParam] ? typeMap[typeParam] : 'broker';

  const t = useTranslations('contact.form');
  const tErrors = useTranslations('contact.errors');
  const [activeTab, setActiveTab] = useState<ContactType>(initialTab);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const phone = typeof payload.phone === 'string' && payload.phone.trim() ? payload.phone.trim() : undefined;
    const doors = typeof payload.doors === 'string' && payload.doors.trim() ? payload.doors.trim() : undefined;
    const city = typeof payload.city === 'string' && payload.city.trim() ? payload.city.trim() : undefined;
    const institution = typeof payload.institution === 'string' && payload.institution.trim() ? payload.institution.trim() : undefined;
    const context = typeof payload.context === 'string' && payload.context.trim() ? payload.context.trim() : undefined;
    const notes = typeof payload.notes === 'string' && payload.notes.trim() ? payload.notes.trim() : undefined;
    const website = typeof payload.website === 'string' && payload.website.trim() ? payload.website.trim() : undefined;

    const message =
      activeTab === 'broker'
        ? notes || `Soumission immeuble${doors ? ` | Portes: ${doors}` : ''}${city ? ` | Ville / Secteur: ${city}` : ''}`
        : context || '';

    const data = {
      type: activeTab,
      name: typeof payload.name === 'string' ? payload.name.trim() : '',
      email: typeof payload.email === 'string' ? payload.email.trim() : '',
      phone,
      doors,
      city,
      institution,
      context,
      notes,
      website,
      message,
    };

    const result = await submitContactForm(data);
    setSending(false);

    if (result.success) {
      setSent(true);
      return;
    }

    if (result.error === 'rate_limited') {
      setError('rateLimited');
      return;
    }

    if (result.error === 'validation') {
      setError('validation');
      return;
    }

    setError('submitFailed');
  };

  if (sent) {
    return (
      <AnimatedSection>
        <div className="mx-auto max-w-lg text-center py-16">
          <CheckCircle className="h-8 w-8 text-gold mx-auto mb-6" />
          <h3 className="font-serif text-2xl text-black">
            {t(`confirmation.${activeTab}.title`)}
          </h3>
          <p className="mt-4 text-sm text-gray leading-relaxed">
            {t(`confirmation.${activeTab}.text`)}
          </p>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-12">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setError(null);
            }}
            className={clsx(
              'px-6 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer',
              activeTab === tab.key
                ? 'bg-black text-white'
                : 'text-gray hover:text-black'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Title + subtitle */}
      <div className="text-center mb-10">
        <h2 className="font-serif text-2xl text-black sm:text-3xl">
          {t(`${activeTab}.title`)}
        </h2>
        <p className="mt-3 text-sm text-gray max-w-lg mx-auto">
          {t(`${activeTab}.subtitle`)}
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        onChange={() => {
          if (error) {
            setError(null);
          }
        }}
        className="mx-auto max-w-xl space-y-6"
      >
        {/* Honeypot */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

        {/* Common fields */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="sr-only" htmlFor="contact-name">
              {t('labels.name')}
            </label>
            <input
              id="contact-name"
              name="name"
              required
              className={inputClasses}
              placeholder={t('fields.name')}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="contact-email">
              {t('labels.email')}
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              className={inputClasses}
              placeholder={t('fields.email')}
            />
          </div>
        </div>

        {/* Broker fields */}
        {activeTab === 'broker' && (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="sr-only" htmlFor="broker-doors">
                  {t('labels.doors')}
                </label>
                <input
                  id="broker-doors"
                  name="doors"
                  required
                  className={inputClasses}
                  placeholder={t('fields.doors')}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="broker-city">
                  {t('labels.city')}
                </label>
                <input
                  id="broker-city"
                  name="city"
                  required
                  className={inputClasses}
                  placeholder={t('fields.city')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="sr-only" htmlFor="broker-phone">
                  {t('labels.phone')}
                </label>
                <input
                  id="broker-phone"
                  name="phone"
                  className={inputClasses}
                  placeholder={t('fields.phone')}
                />
              </div>
              <div />
            </div>
            <div>
              <label className="sr-only" htmlFor="broker-notes">
                {t('labels.notes')}
              </label>
              <textarea
                id="broker-notes"
                name="notes"
                rows={3}
                className={inputClasses}
                placeholder={t('fields.notes')}
              />
            </div>
          </>
        )}

        {/* Lender fields */}
        {activeTab === 'lender' && (
          <>
            <div>
              <label className="sr-only" htmlFor="lender-institution">
                {t('labels.institution')}
              </label>
              <input
                id="lender-institution"
                name="institution"
                className={inputClasses}
                placeholder={t('fields.institution')}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="lender-context">
                {t('labels.message')}
              </label>
              <textarea
                id="lender-context"
                name="context"
                required
                rows={3}
                className={inputClasses}
                placeholder={t('fields.message')}
              />
            </div>
          </>
        )}

        {/* Partner fields */}
        {activeTab === 'partner' && (
          <div>
            <label className="sr-only" htmlFor="partner-context">
              {t('labels.context')}
            </label>
            <textarea
              id="partner-context"
              name="context"
              required
              rows={4}
              className={inputClasses}
              placeholder={t('fields.context')}
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {tErrors(error)}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 pt-4">
          <Button type="submit" size="lg" disabled={sending}>
            <Mail className="mr-2 h-4 w-4" />
            {sending ? t('sending') : t(`${activeTab}.cta`)}
          </Button>
          <p className="text-xs text-gray/50">
            {t(`${activeTab}.reassurance`)}
          </p>
        </div>
      </form>
    </div>
  );
}
