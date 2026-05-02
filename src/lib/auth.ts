import { createHmac, timingSafeEqual } from 'crypto';
import type { Role } from '@prisma/client';
import { getDb } from '@/lib/db';
import { verifyPasswordHash } from '@/lib/password';
import { isRole } from '@/lib/users';

export const SESSION_COOKIE_NAME = 'orea_session';

export type SessionPayload = {
  userId: string;
  username: string;
  role: Role;
  exp: number;
};

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

type AuthUser = {
  id: string;
  username: string;
  role: Role;
  passwordHash: string;
};

export function getSecret(): string {
  const secret = process.env.OREA_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('OREA_SESSION_SECRET must be set and at least 32 characters long.');
  }

  return secret;
}

export function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function base64UrlDecode(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);

  return Buffer.from(`${base64}${padding}`, 'base64').toString('utf8');
}

export function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function getSessionSigningSecret(passwordHash: string): string {
  return `${getSecret()}:${passwordHash}`;
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<AuthUser | null> {
  const normalizedUsername = username.trim().toLowerCase();

  const user = await getDb().user.findUnique({
    where: { username: normalizedUsername },
    select: {
      id: true,
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPasswordHash(password, user.passwordHash))) {
    return null;
  }

  return user;
}

export function createSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, getSessionSigningSecret(user.passwordHash));

  return `${encodedPayload}.${signature}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  const maxLength = Math.max(leftBuffer.length, rightBuffer.length);
  const leftPadded = Buffer.alloc(maxLength);
  const rightPadded = Buffer.alloc(maxLength);

  leftBuffer.copy(leftPadded);
  rightBuffer.copy(rightPadded);

  const matches = timingSafeEqual(leftPadded, rightPadded);

  return leftBuffer.length === rightBuffer.length && matches;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature, extra] = token.split('.');

  if (!encodedPayload || !providedSignature || extra !== undefined) {
    return null;
  }

  let payload: Partial<SessionPayload>;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionPayload>;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    typeof payload.userId !== 'string' ||
    typeof payload.username !== 'string' ||
    typeof payload.role !== 'string' ||
    !isRole(payload.role) ||
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {
    return null;
  }

  const user = await getDb().user.findUnique({
    where: { id: payload.userId },
    select: {
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || user.username !== payload.username || user.role !== payload.role) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, getSessionSigningSecret(user.passwordHash));

  if (!constantTimeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    exp: payload.exp,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return await verifySessionToken(token);
}
