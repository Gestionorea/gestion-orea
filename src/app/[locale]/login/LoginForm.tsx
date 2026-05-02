'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { loginAction, type LoginState } from '@/app/actions/auth';

function SubmitButton() {
  const t = useTranslations('login');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

export default function LoginForm({ locale, from }: { locale: string; from: string }) {
  const t = useTranslations('login');
  const initialState: LoginState = {};
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="from" value={from} />
      <label className="block text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
        {t('usernameLabel')}
        <input
          name="username"
          type="text"
          required
          autoFocus
          autoComplete="username"
          className="mt-3 block w-full border border-gray-300 px-4 py-3 text-base normal-case tracking-normal text-black outline-none transition focus:border-black"
        />
      </label>
      <label className="mt-5 block text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
        {t('passwordLabel')}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-3 block w-full border border-gray-300 px-4 py-3 text-base normal-case tracking-normal text-black outline-none transition focus:border-black"
        />
      </label>
      {state.error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {state.error === 'too_many_attempts' ? t('errorTooMany') : t('errorInvalid')}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
