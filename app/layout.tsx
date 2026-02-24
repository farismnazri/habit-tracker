import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Habit Tracker',
  description: 'LAN-only habit tracker for Raspberry Pi',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/SAILOR_PCR-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/SAILOR_PCR-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/SAILOR_PCR.png', sizes: '890x890', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-v2.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-v2-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/apple-touch-icon-v2-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Habits',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
