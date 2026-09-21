import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './mobile.css';
import './game-menus.css';
import './game-objects.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});
export const metadata: Metadata = {
  title: 'Axie Vault Raiders',
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  description:
    'Raid the ruins of Lunacia. Vertical dungeons, Axie Classic powers and Sparks to customize your refuge. Play in English or Spanish.',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101f23',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geist.variable} ${mono.variable} ${display.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
