'use server';

import type { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  createUser,
  deleteUser,
  getUserById,
  isRole,
  isUniqueConstraintError,
  normalizeUsername,
  resetUserPassword,
  updateUser,
} from '@/lib/users';

export type UserActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  newPassword?: string;
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

async function requireOwner() {
  const session = await getSession();

  if (!session) {
    redirect('/fr/login');
  }

  const me = await getUserById(session.userId);

  if (!me || me.role !== 'owner') {
    redirect('/fr/perso');
  }

  return { session, me };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === 'string' ? value : '';
}

function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'invalidUsername';
  }

  return null;
}

function validateRole(role: string): Role | null {
  return isRole(role) ? role : null;
}

export async function createUserAction(
  prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void prev;
  await requireOwner();

  const username = normalizeUsername(getString(formData, 'username'));
  const password = getString(formData, 'password');
  const confirmPassword = getString(formData, 'confirmPassword');
  const role = validateRole(getString(formData, 'role'));
  const fieldErrors: Record<string, string> = {};

  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  if (password.length < 8) fieldErrors.password = 'tooShort';
  if (password !== confirmPassword) fieldErrors.confirmPassword = 'mismatch';
  if (!role) fieldErrors.role = 'invalidRole';

  if (Object.keys(fieldErrors).length > 0 || !role) {
    return { success: false, fieldErrors };
  }

  try {
    await createUser({ username, password, role });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: 'usernameTaken',
        fieldErrors: { username: 'usernameTaken' },
      };
    }

    throw error;
  }

  redirect('/fr/perso/admin/utilisateurs?created=1');
}

export async function updateUserAction(
  prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void prev;
  const { session } = await requireOwner();
  const id = getString(formData, 'id');
  const target = await getUserById(id);

  if (!target) {
    return { success: false, error: 'notFound' };
  }

  const username = normalizeUsername(getString(formData, 'username'));
  const roleRaw = getString(formData, 'role');
  const role = validateRole(roleRaw);
  const fieldErrors: Record<string, string> = {};

  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  if (!role) fieldErrors.role = 'invalidRole';

  if (target.id === session.userId && role && role !== target.role) {
    return { success: false, error: 'cantDemoteSelf' };
  }

  if (target.role === 'owner' && target.id !== session.userId) {
    return { success: false, error: 'cantEditOtherOwner' };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  try {
    await updateUser({
      id: target.id,
      username,
      role: target.id === session.userId ? undefined : role ?? target.role,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: 'usernameTaken',
        fieldErrors: { username: 'usernameTaken' },
      };
    }

    throw error;
  }

  redirect('/fr/perso/admin/utilisateurs?updated=1');
}

export async function deleteUserAction(
  prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void prev;
  const { session } = await requireOwner();
  const id = getString(formData, 'id');

  if (id === session.userId) {
    return { success: false, error: 'cantDeleteSelf' };
  }

  const target = await getUserById(id);

  if (!target) {
    return { success: false, error: 'notFound' };
  }

  if (target.role === 'owner') {
    return { success: false, error: 'cantEditOtherOwner' };
  }

  await deleteUser(id);
  redirect('/fr/perso/admin/utilisateurs?deleted=1');
}

export async function resetUserPasswordAction(
  prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void prev;
  const { session } = await requireOwner();

  const id = getString(formData, 'id');
  const newPassword = getString(formData, 'newPassword');
  const target = await getUserById(id);

  if (!target) {
    return { success: false, error: 'notFound' };
  }

  if (target.role === 'owner' && target.id !== session.userId) {
    return { success: false, error: 'cantEditOtherOwner' };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: 'tooShort',
      fieldErrors: { newPassword: 'tooShort' },
    };
  }

  await resetUserPassword(target.id, newPassword);

  return { success: true, newPassword };
}
