import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth';

const intlMiddleware = createMiddleware(routing);
const PROTECTED_PREFIXES = ['/perso', '/private'];

function isProtectedPath(pathname: string): boolean {
  for (const locale of routing.locales) {
    for (const prefix of PROTECTED_PREFIXES) {
      if (pathname === `/${locale}${prefix}` || pathname.startsWith(`/${locale}${prefix}/`)) {
        return true;
      }
    }
  }

  return false;
}

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/opengraph-image') {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  const rewriteTarget = intlResponse.headers.get('x-middleware-rewrite');
  const targetPathname = (() => {
    if (rewriteTarget) {
      try {
        return new URL(rewriteTarget, request.url).pathname;
      } catch {
        /* fallthrough */
      }
    }

    return request.nextUrl.pathname;
  })();

  if (!isProtectedPath(targetPathname)) {
    return intlResponse;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (verifySessionToken(token)) {
    return intlResponse;
  }

  const localeMatch = targetPathname.match(/^\/(fr|en)(\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
  runtime: 'nodejs',
};
