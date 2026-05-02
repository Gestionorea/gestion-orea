'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { resetUserPasswordAction, type UserActionState } from '@/app/actions/users';

function SubmitButton() {
  const t = useTranslations('perso.admin.users');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 border border-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
    >
      {pending ? t('form.submitting') : t('form.resetPassword')}
    </button>
  );
}

export default function ResetPasswordForm({ userId }: { userId: string }) {
  const t = useTranslations('perso.admin.users');
  const [state, formAction] = useActionState(resetUserPasswordAction, { success: false });
  const error = state.fieldErrors?.newPassword ?? state.error;

  return (
    <form action={formAction} className="mt-10 max-w-xl border-t border-gray-200 pt-8">
      <input type="hidden" name="id" value={userId} />
      <h2 className="font-serif text-xl tracking-[0.08em] text-black">
        {t('resetTitle')}
      </h2>
      <p className="mt-3 text-sm leading-6 text-gray-500">{t('resetSubtitle')}</p>
      <label className="mt-6 block text-sm font-medium text-gray-700">
        {t('form.newPassword')}
        <input
          name="newPassword"
          type="text"
          required
          autoComplete="off"
          className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
        />
      </label>
      {error ? (
        <p className="mt-3 text-sm text-red-700">
          {t(`errors.${error}` as Parameters<typeof t>[0])}
        </p>
      ) : null}
      {state.success && state.newPassword ? (
        <div className="mt-5 border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">{t('resetSuccess')}</p>
          <code className="mt-2 block break-all bg-white p-3 text-black">
            {state.newPassword}
          </code>
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
