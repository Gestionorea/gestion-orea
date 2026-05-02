'use client';

import type { Role } from '@prisma/client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { updateUserAction, type UserActionState } from '@/app/actions/users';

const USER_ROLES: Role[] = ['owner', 'accountant', 'assistant'];

type UserEditItem = {
  id: string;
  username: string;
  role: Role;
};

function SubmitButton() {
  const t = useTranslations('perso.admin.users');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('form.submitting') : t('form.save')}
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

export default function EditUserForm({
  user,
  isSelf,
}: {
  user: UserEditItem;
  isSelf: boolean;
}) {
  const t = useTranslations('perso.admin.users');
  const [state, formAction] = useActionState(updateUserAction, { success: false });

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-6">
      <input type="hidden" name="id" value={user.id} />
      <label className="block text-sm font-medium text-gray-700">
        {t('form.username')}
        <input
          name="username"
          type="text"
          required
          defaultValue={user.username}
          autoComplete="username"
          className="mt-2 block w-full border border-gray-300 px-4 py-3 text-base text-black outline-none transition focus:border-black"
        />
        <FieldError state={state} field="username" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.role')}
        <select
          name="role"
          defaultValue={user.role}
          disabled={isSelf}
          className="mt-2 block w-full border border-gray-300 bg-white px-4 py-3 text-base text-black outline-none transition focus:border-black disabled:bg-gray-100 disabled:text-gray-500"
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </select>
        {isSelf ? <input type="hidden" name="role" value={user.role} /> : null}
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
