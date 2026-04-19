import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestion ORÉA',
    short_name: 'ORÉA',
    description: 'Holding immobilière multirésidentielle au Québec.',
    start_url: '/fr',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
