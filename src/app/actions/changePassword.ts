'use server';

import { createSessionToken, getSession, setSessionCookie } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { hashPassword, verifyPasswordHash } from '@/lib/password';

export type ChangePasswordState = {
  error?: 'wrong_current' | 'mismatch' | 'too_short' | 'same_as_old' | 'unauthorized';
  success?: boolean;
};

export async function changePasswordAction(
  prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  void prev;

  const session = await getSession();

  if (!session) {
    return { error: 'unauthorized' };
  }

  const currentPassword = formData.get('currentPassword');
  const newPassword = formData.get('newPassword');
  const confirmPassword = formData.get('confirmPassword');

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return { error: 'wrong_current' };
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPasswordHash(currentPassword, user.passwordHash))) {
    return { error: 'wrong_current' };
  }

  if (newPassword.length < 8) {
    return { error: 'too_short' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'mismatch' };
  }

  if (newPassword === currentPassword) {
    return { error: 'same_as_old' };
  }

  const passwordHash = await hashPassword(newPassword);
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
    select: {
      id: true,
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  await setSessionCookie(createSessionToken(updatedUser));

  return { success: true };
}
