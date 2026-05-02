import type { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export const USER_ROLES: Role[] = ['owner', 'accountant', 'assistant'];

export type UserListItem = {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export type UserEditItem = UserListItem;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isRole(value: string): value is Role {
  return USER_ROLES.includes(value as Role);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function listUsers(): Promise<UserListItem[]> {
  return await getDb().user.findMany({
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getUserById(id: string): Promise<UserEditItem | null> {
  return await getDb().user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(input: {
  username: string;
  password: string;
  role: Role;
}): Promise<UserEditItem> {
  const user = await getDb().user.create({
    data: {
      username: normalizeUsername(input.username),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function updateUser(input: {
  id: string;
  username: string;
  role?: Role;
}): Promise<UserEditItem> {
  const data: { username: string; role?: Role } = {
    username: normalizeUsername(input.username),
  };

  if (input.role) {
    data.role = input.role;
  }

  return await getDb().user.update({
    where: { id: input.id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await getDb().user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
    },
  });
}

export async function deleteUser(id: string): Promise<void> {
  await getDb().user.delete({
    where: { id },
  });
}
