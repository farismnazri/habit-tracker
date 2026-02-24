import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        active: 'var(--color-active)',
        'active-soft': 'var(--color-active-soft)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        'ink-faint': 'var(--color-ink-faint)',
        line: 'var(--color-line)',
        'focus-ring': 'var(--color-focus-ring)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
    },
  },
  plugins: [],
};

export default config;
