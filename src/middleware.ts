import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth';

const intlMiddleware = createMiddleware(routing);
const PROTECTED_PREFIXES = ['/perso', '/private'];
const LEGACY_HOSTS = new Set(['gestionorea.com', 'www.gestionorea.com']);
const NEVER_REDIRECT_HOSTS = new Set([
  'oreaholding.ca',
  'www.oreaholding.ca',
  'localhost',
  '127.0.0.1',
]);

function shouldRedirectToCanonical(hostname: string): boolean {
  if (NEVER_REDIRECT_HOSTS.has(hostname) || hostname.includes('.railway.app')) {
    return false;
  }

  return LEGACY_HOSTS.has(hostname);
}

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

export default async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();

  // Redirect only legacy domains before locale/auth middleware to avoid canonical loops.
  if (shouldRedirectToCanonical(hostname)) {
    const redirectUrl = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      'https://oreaholding.ca'
    );
    return NextResponse.redirect(redirectUrl, 301);
  }

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

  if (await verifySessionToken(token)) {
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
