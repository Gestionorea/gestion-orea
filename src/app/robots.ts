import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/fr/login', '/en/login', '/fr/perso', '/en/private'],
    },
    sitemap: 'https://oreaholding.ca/sitemap.xml',
  };
}
