import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Habit Tracker',
    short_name: 'Habits',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfdfd',
    theme_color: '#ffc9dc',
    icons: [
      {
        src: '/icons/SAILOR_PCR-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/SAILOR_PCR-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/SAILOR_PCR.png',
        sizes: '890x890',
        type: 'image/png',
      },
    ],
  };
}
