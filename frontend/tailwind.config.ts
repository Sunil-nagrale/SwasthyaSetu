import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#dde8f2',
          200: '#c0d5e7',
          300: '#94bbd8',
          400: '#619cc4',
          500: '#3c7eaf',
          600: '#123B5D', // Deep Navy Primary
          700: '#0e2f4a',
          800: '#0a2337',
          900: '#061724',
          950: '#030d15',
        },
        accent: {
          50: '#f0fdf9',
          100: '#ccfbf1',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0F9D8A', // Accent Teal
          600: '#0d8a79',
          700: '#0a6c5e',
          800: '#085348',
          900: '#053630',
        },
        brand: {
          50: '#f0f5fa',
          100: '#dde8f2',
          200: '#c0d5e7',
          300: '#94bbd8',
          400: '#619cc4',
          500: '#3c7eaf',
          600: '#123B5D',
          700: '#0F9D8A',
          800: '#0b7264',
          900: '#061724',
        },
        medical: {
          navy: '#123B5D',
          teal: '#0F9D8A',
          text: '#122033',
          muted: '#52657A',
          bg: '#F5F8FA',
          surface: '#FFFFFF',
          border: '#CBD5E1',
          success: '#168A5B',
          warning: '#B7791F',
          error: '#C53030',
          emergency: '#B91C1C',
        },
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#C53030',
          700: '#B91C1C',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 2px 8px 0 rgba(15, 23, 42, 0.06)',
        'elevated': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
      },
      borderRadius: {
        'medical': '0.625rem', // 10px
      }
    },
  },
  plugins: [],
};

export default config;
