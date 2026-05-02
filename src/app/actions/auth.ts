'use server';

import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifyCredentials,
} from '@/lib/auth';

export type LoginState = { error?: string };

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function resolveLocale(localeRaw: FormDataEntryValue | null) {
  const locale = typeof localeRaw === 'string' ? localeRaw : '';

  return routing.locales.includes(locale as 'fr' | 'en') ? locale : routing.defaultLocale;
}

function getDefaultPrivatePath(locale: string): string {
  return locale === 'en' ? `/${locale}/private` : `/${locale}/perso`;
}

function getValidRedirectPath(from: FormDataEntryValue | null, locale: string): string {
  if (typeof from !== 'string') {
    return getDefaultPrivatePath(locale);
  }

  if (from.startsWith(`/${locale}/`) && !from.includes('//')) {
    return from;
  }

  return getDefaultPrivatePath(locale);
}

function isRateLimited(): boolean {
  const now = Date.now();
  const current = attempts.get('global');

  if (!current || current.resetAt <= now) {
    attempts.set('global', { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;

  return current.count > RATE_LIMIT_MAX_ATTEMPTS;
}

function resetRateLimit(): void {
  attempts.delete('global');
}

export async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  void prev;

  const username = formData.get('username');
  const password = formData.get('password');
  const locale = resolveLocale(formData.get('locale'));

  if (isRateLimited()) {
    return { error: 'too_many_attempts' };
  }

  if (typeof username === 'string' && typeof password === 'string') {
    const user = await verifyCredentials(username.trim(), password);

    if (user) {
      resetRateLimit();
      await setSessionCookie(createSessionToken(user));
      redirect(getValidRedirectPath(formData.get('from'), locale));
    }
  }

  return { error: 'invalid' };
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = resolveLocale(formData.get('locale'));

  await clearSessionCookie();
  redirect(`/${locale}`);
}
