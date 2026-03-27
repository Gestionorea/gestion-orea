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
  const [activeTab, setActiveTab] = useState<ContactType>(initialTab);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: Record<string, string> = { type: activeTab };
    formData.forEach((value, key) => {
      if (typeof value === 'string' && value.trim()) {
        data[key] = value.trim();
      }
    });

    // Honeypot check
    if (data.website) {
      setSending(false);
      return;
    }

    const result = await submitContactForm(data as any);
    setSending(false);

    if (result.success) {
      setSent(true);
    }
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
            onClick={() => setActiveTab(tab.key)}
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
      <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
        {/* Honeypot */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

        {/* Common fields */}
        <div className="grid grid-cols-2 gap-6">
          <input
            name="name"
            required
            className={inputClasses}
            placeholder={t('fields.name')}
          />
          <input
            name="email"
            type="email"
            required
            className={inputClasses}
            placeholder={t('fields.email')}
          />
        </div>

        {/* Broker fields */}
        {activeTab === 'broker' && (
          <>
            <div className="grid grid-cols-2 gap-6">
              <input
                name="doors"
                required
                className={inputClasses}
                placeholder={t('fields.doors')}
              />
              <input
                name="city"
                required
                className={inputClasses}
                placeholder={t('fields.city')}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <input
                name="phone"
                className={inputClasses}
                placeholder={t('fields.phone')}
              />
              <div />
            </div>
            <textarea
              name="notes"
              rows={3}
              className={inputClasses}
              placeholder={t('fields.notes')}
            />
          </>
        )}

        {/* Lender fields */}
        {activeTab === 'lender' && (
          <>
            <input
              name="institution"
              className={inputClasses}
              placeholder={t('fields.institution')}
            />
            <textarea
              name="context"
              rows={3}
              className={inputClasses}
              placeholder={t('fields.message')}
            />
          </>
        )}

        {/* Partner fields */}
        {activeTab === 'partner' && (
          <textarea
            name="context"
            required
            rows={4}
            className={inputClasses}
            placeholder={t('fields.context')}
          />
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
