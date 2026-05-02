'use client';

import type { Role } from '@prisma/client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createUserAction, type UserActionState } from '@/app/actions/users';

const USER_ROLES: Role[] = ['owner', 'accountant', 'assistant'];

function SubmitButton() {
  const t = useTranslations('perso.admin.users');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('form.submitting') : t('form.create')}
    </button>
  );
}

function FieldError({ state, field }: { state: UserActionState; field: string }) {
  const t = useTranslations('perso.admin.users');
  const error = state.fieldErrors?.[field];

  if (!error) return null;

  return (
    <p className="mt-2 text-sm text-red-700">
      {t(`errors.${error}` as Parameters<typeof t>[0])}
    </p>
  );
}

export default function NewUserForm() {
  const t = useTranslations('perso.admin.users');
  const [state, formAction] = useActionState(createUserAction, { success: false });

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-6">
      <label className="block text-sm font-medium text-gray-700">
        {t('form.username')}
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
        />
        <FieldError state={state} field="username" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.password')}
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
        />
        <FieldError state={state} field="password" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.confirmPassword')}
        <input
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
        />
        <FieldError state={state} field="confirmPassword" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.role')}
        <select
          name="role"
          defaultValue="assistant"
          className="mt-2 block w-full border border-gray-300 bg-white px-4 py-3 text-base text-black outline-none transition focus:border-black"
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </select>
        <FieldError state={state} field="role" />
      </label>
      {state.error ? (
        <p className="text-sm text-red-700">
          {t(`errors.${state.error}` as Parameters<typeof t>[0])}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
