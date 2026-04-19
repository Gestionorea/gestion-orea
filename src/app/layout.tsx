import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = 'https://gestionorea.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Gestion ORÉA | Holding immobilière multirésidentielle au Québec',
    template: '%s',
  },
  description:
    'Holding immobilière spécialisée dans l\'acquisition et le repositionnement d\'actifs multirésidentiels au Québec. 450+ logements acquis depuis 2020.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    alternateLocale: 'en_CA',
    siteName: 'Gestion ORÉA',
    title: 'Gestion ORÉA | Holding Immobilière',
    description:
      'Acquérir. Repositionner. Croître. Holding immobilière multirésidentielle au Québec — 450+ logements acquis depuis 2020.',
    url: siteUrl,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Gestion ORÉA — Holding immobilière',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestion ORÉA | Holding Immobilière',
    description:
      'Acquérir. Repositionner. Croître. Holding immobilière multirésidentielle au Québec.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
