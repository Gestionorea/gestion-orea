'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  changePasswordAction,
  type ChangePasswordState,
} from '@/app/actions/changePassword';

function SubmitButton() {
  const t = useTranslations('admin.password');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 w-full bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

type ErrorMessageKey =
  | 'errors.wrongCurrent'
  | 'errors.mismatch'
  | 'errors.tooShort'
  | 'errors.sameAsOld'
  | 'errors.unauthorized';

function getErrorKey(error: ChangePasswordState['error']): ErrorMessageKey | null {
  switch (error) {
    case 'wrong_current':
      return 'errors.wrongCurrent';
    case 'mismatch':
      return 'errors.mismatch';
    case 'too_short':
      return 'errors.tooShort';
    case 'same_as_old':
      return 'errors.sameAsOld';
    case 'unauthorized':
      return 'errors.unauthorized';
    default:
      return null;
  }
}

export default function ChangePasswordForm() {
  const t = useTranslations('admin.password');
  const [state, formAction] = useActionState(changePasswordAction, {});
  const errorKey = getErrorKey(state.error);

  return (
    <form action={formAction} className="mt-8 max-w-xl">
      <div className="space-y-6">
        <label className="block text-sm font-medium text-gray-700">
          {t('currentPassword')}
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t('newPassword')}
          <input
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {t('confirmPassword')}
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
          />
        </label>
      </div>

      {errorKey ? (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {t(errorKey)}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-5 text-sm text-green-700" role="status">
          {t('success')}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
