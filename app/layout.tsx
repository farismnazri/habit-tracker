import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Habit Tracker',
  description: 'LAN-only habit tracker for Raspberry Pi',
  manifest: '/manifest.webmanifest',
  other: {
    // Next emits `mobile-web-app-capable`, but older iOS installs can still
    // depend on the Apple-prefixed tag for proper home-screen behavior.
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/SAILOR_PCR-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/SAILOR_PCR-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/SAILOR_PCR.png', sizes: '890x890', type: 'image/png' },
    ],
    apple: [
      // Unsized fallback improves compatibility with older iOS/iPadOS when
      // adding to the home screen. New path also breaks Safari icon cache.
      { url: '/apple-touch-icon-sailor.png' },
      { url: '/apple-touch-icon-sailor.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-sailor-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/apple-touch-icon-sailor-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/apple-touch-icon-sailor.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Habit Tracker',
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
