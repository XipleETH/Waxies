import type { Metadata } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
const geist = Geist({variable: '--font-geist-sans', subsets: ['latin']});
const mono = Geist_Mono({variable: '--font-geist-mono', subsets: ['latin']});
const display = Space_Grotesk({variable: '--font-display', subsets: ['latin']});
export const metadata: Metadata = {
  title: 'WAXIS · Vault Raiders',
  icons: {icon: '/favicon.svg'},
  manifest: '/manifest.webmanifest',
  description: 'Asalta las ruinas de Lunacia. Plataformas 2.5D con Axies, partes de Axie Classic y cofres de práctica con SLP, AXS y RON.',
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="es" className="dark"><body className={`${geist.variable} ${mono.variable} ${display.variable}`}>{children}</body></html>;
}
