import type { MetadataRoute } from 'next';

const siteUrl = 'https://gestionorea.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['fr', 'en'];
  const routes = [
    '',
    '/realisations',
    '/a-propos',
    '/contact',
    '/outils',
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${siteUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  return entries;
}
