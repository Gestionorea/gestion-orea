import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  pathnames: {
    '/': '/',
    '/realisations': {
      fr: '/realisations',
      en: '/achievements',
    },
    '/a-propos': {
      fr: '/a-propos',
      en: '/about',
    },
    '/contact': '/contact',
    '/outils': {
      fr: '/outils',
      en: '/tools',
    },
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathnames = keyof typeof routing.pathnames;
