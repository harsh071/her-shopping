import type { Metadata } from 'next';
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({
  variable: '--font-sans-face',
  subsets: ['latin'],
});

const serif = Instrument_Serif({
  variable: '--font-serif-face',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: 'Her Shopping — Shape the store around your mission',
  description:
    'An agent-ready adaptive storefront that reorganizes products around your trip, budget, and priorities.',
  openGraph: {
    title: 'Her Shopping',
    description: 'Shape the store around your mission.',
    images: [
      {
        url: '/og.png',
        width: 1536,
        height: 906,
        alt: 'Her Shopping expedition kit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Her Shopping',
    description: 'Shape the store around your mission.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
