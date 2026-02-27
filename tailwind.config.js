/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './providers/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './router/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          strong: 'rgb(var(--brand-strong-rgb) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          soft: 'rgb(var(--surface-soft-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          strong: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'btn-primary-gradient':
          'linear-gradient(135deg, rgb(var(--brand-rgb)) 0%, rgb(var(--brand-soft-rgb)) 54%, rgb(var(--accent-rgb)) 100%)',
        'hero-bg-gradient':
          'radial-gradient(circle at 90% 4%, rgb(var(--brand-soft-rgb) / 0.2), transparent 45%), linear-gradient(160deg, rgb(var(--surface-rgb) / 0.98), rgb(var(--surface-soft-rgb) / 0.98))',
      },
      boxShadow: {
        'brand-soft': '0 18px 28px -20px rgb(var(--brand-rgb) / 0.35)',
      },
    },
  },
  plugins: [],
};
