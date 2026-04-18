import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://gestionorea.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ORÉA | Holding immobilière multirésidentielle au Québec',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestion ORÉA | Holding Immobilière',
    description:
      'Acquérir. Repositionner. Croître. Holding immobilière multirésidentielle au Québec.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
