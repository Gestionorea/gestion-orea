import { routing } from '@/i18n/routing';

const SITE_URL = 'https://gestionorea.com';

type PathnameKey = keyof typeof routing.pathnames;

export function buildAlternates(pathnameKey: PathnameKey) {
  const languages: Record<string, string> = {};
  const localizedPathname = routing.pathnames[pathnameKey];

  for (const locale of routing.locales) {
    const path =
      typeof localizedPathname === 'string'
        ? localizedPathname
        : localizedPathname[locale];
    const fullPath = path === '/' ? `/${locale}` : `/${locale}${path}`;

    languages[locale] = `${SITE_URL}${fullPath}`;
  }

  const fallbackPath =
    typeof localizedPathname === 'string'
      ? localizedPathname
      : localizedPathname.fr;

  languages['x-default'] = `${SITE_URL}${fallbackPath === '/' ? '' : fallbackPath}`;

  return { languages };
}
