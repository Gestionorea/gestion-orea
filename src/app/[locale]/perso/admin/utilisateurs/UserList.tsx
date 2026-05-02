'use client';

import type { Role } from '@prisma/client';
import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteUserAction, type UserActionState } from '@/app/actions/users';

type UserListUser = {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
};

function DeleteUserForm({ id }: { id: string }) {
  const t = useTranslations('perso.admin.users');
  const [state, formAction] = useActionState(deleteUserAction, { success: false });

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm text-red-700 transition hover:text-red-900"
        onClick={(event) => {
          if (!window.confirm(t('deleteConfirm'))) {
            event.preventDefault();
          }
        }}
      >
        {t('delete')}
      </button>
      {state.error ? (
        <span className="ml-3 text-xs text-red-700">
          {t(`errors.${state.error}` as Parameters<typeof t>[0])}
        </span>
      ) : null}
    </form>
  );
}

export default function UserList({
  users,
  currentUserId,
  locale,
}: {
  users: UserListUser[];
  currentUserId: string;
  locale: string;
}) {
  const t = useTranslations('perso.admin.users');

  return (
    <div className="mt-8 overflow-x-auto border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('columns.username')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.role')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.created')}</th>
            <th className="px-4 py-3 font-medium">{t('columns.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const canEdit = user.role !== 'owner' || isSelf;

            return (
              <tr key={user.id}>
                <td className="px-4 py-4 font-medium text-black">
                  {user.username}
                  {isSelf ? <span className="ml-2 text-gray-500">({t('you')})</span> : null}
                </td>
                <td className="px-4 py-4 text-gray-600">{t(`roles.${user.role}`)}</td>
                <td className="px-4 py-4 text-gray-600">
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                    new Date(user.createdAt),
                  )}
                </td>
                <td className="px-4 py-4">
                  {canEdit ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <Link
                        href={`/${locale}/perso/admin/utilisateurs/${user.id}`}
                        className="text-sm text-black underline-offset-4 transition hover:underline"
                      >
                        {t('edit')}
                      </Link>
                      {isSelf ? (
                        <span className="text-sm text-gray-500">({t('owner')})</span>
                      ) : (
                        <DeleteUserForm id={user.id} />
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">{t('owner')}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
