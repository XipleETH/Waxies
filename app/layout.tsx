import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './mobile.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});
export const metadata: Metadata = {
  title: 'WAXIS · Vault Raiders',
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  description:
    'Asalta las ruinas de Lunacia. Torres verticales con Axies, trampas de Axie Classic y Chispas para decorar tu refugio.',
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
    <html lang="es" className="dark">
      <body
        className={`${geist.variable} ${mono.variable} ${display.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
