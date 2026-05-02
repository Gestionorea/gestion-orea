'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  initialOneDriveTestState,
  testConnectionAction,
} from '@/app/actions/onedrive';

function SubmitButton() {
  const t = useTranslations('perso.admin.onedrive');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white disabled:opacity-50"
    >
      {pending ? t('test.running') : t('test.button')}
    </button>
  );
}

export default function TestConnectionButton({ locale }: { locale: string }) {
  const t = useTranslations('perso.admin.onedrive');
  const [state, formAction] = useActionState(testConnectionAction, initialOneDriveTestState);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="mt-6">
      <form action={formAction}>
        <SubmitButton />
      </form>

      {state.error ? (
        <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">{t('test.error')}</p>
          <p className="mt-2">{state.error}</p>
        </div>
      ) : null}

      {state.ping ? (
        <div className={`mt-6 border p-4 text-sm ${state.ping.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <p className="font-medium">{state.ping.ok ? t('test.ok') : t('test.ko')}</p>
          {state.ping.ok ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.16em]">{t('test.user')}</dt>
                <dd className="mt-1">{state.ping.userPrincipalName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.16em]">{t('test.quota')}</dt>
                <dd className="mt-1">
                  {state.ping.driveQuota.used} / {state.ping.driveQuota.total}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2">{state.ping.error}</p>
          )}
        </div>
      ) : null}

      {state.items ? (
        <div className="mt-6 border border-gray-200 p-4">
          <h2 className="font-serif text-xl tracking-[0.06em] text-black">{t('test.folder')}</h2>
          {state.items.length > 0 ? (
            <ul className="mt-4 divide-y divide-gray-200">
              {state.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-black underline">
                    {item.name}
                  </a>
                  <span className="text-gray-500">{formatter.format(new Date(item.lastModifiedDateTime))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">{t('test.folderEmpty')}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
