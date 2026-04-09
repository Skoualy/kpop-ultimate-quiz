import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'kq-base': 'var(--color-bg-base)',
        'kq-surface': 'var(--color-bg-surface)',
        'kq-elevated': 'var(--color-bg-elevated)',
        'kq-border': 'var(--color-border)',
        'kq-primary': 'var(--color-primary)',
        'kq-primary-soft': 'var(--color-primary-light)',
        'kq-accent': 'var(--color-accent)',
        'kq-accent-soft': 'var(--color-accent-light)',
        'kq-text': 'var(--color-text)',
        'kq-muted': 'var(--color-text-muted)',
        'kq-success': 'var(--color-success)',
        'kq-warning': 'var(--color-warning)',
        'kq-danger': 'var(--color-danger)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        kq: '0.75rem',
      },
      boxShadow: {
        'kq-glow': '0 0 20px rgba(124, 58, 237, 0.3)',
        'kq-glow-accent': '0 0 20px rgba(236, 72, 153, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
