import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const siteUrl = 'https://gestionorea.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const [pathname, localizedPathname] of Object.entries(routing.pathnames)) {
      const localizedPath =
        typeof localizedPathname === 'string'
          ? localizedPathname
          : localizedPathname[locale];
      const localePath = localizedPath === '/' ? `/${locale}` : `/${locale}${localizedPath}`;

      entries.push({
        url: `${siteUrl}${localePath}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: pathname === '/' ? 1.0 : 0.8,
      });
    }
  }

  return entries;
}
