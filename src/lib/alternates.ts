import { routing } from '@/i18n/routing';

const SITE_URL = 'https://gestionorea.com';

type PathnameKey = keyof typeof routing.pathnames;

export function buildAlternates(pathnameKey: PathnameKey, locale?: string) {
  const languages: Record<string, string> = {};
  const localizedPathname = routing.pathnames[pathnameKey];

  for (const loc of routing.locales) {
    const path =
      typeof localizedPathname === 'string'
        ? localizedPathname
        : localizedPathname[loc];
    const fullPath = path === '/' ? `/${loc}` : `/${loc}${path}`;

    languages[loc] = `${SITE_URL}${fullPath}`;
  }

  const fallbackPath =
    typeof localizedPathname === 'string'
      ? localizedPathname
      : localizedPathname.fr;

  languages['x-default'] = `${SITE_URL}${fallbackPath === '/' ? '' : fallbackPath}`;

  if (locale && languages[locale]) {
    return { canonical: languages[locale], languages };
  }

  return { languages };
}
