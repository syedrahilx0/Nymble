/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#050A14', 900: '#08111F', 850: '#0B1628', 800: '#0F1B30', 700: '#162640', 600: '#1F3355' },
        line: '#1E2F4D',
        mint: { 300: '#6EF3C5', 400: '#2DE2A6', 500: '#10C98B', 600: '#0BA874' },
        sky: { 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4' },
        fog: { 100: '#E8EEF8', 300: '#B4C2DA', 400: '#8A9BB8', 500: '#63748F' },
        alert: { 400: '#FB7185', 500: '#F43F5E' },
        amber: { 400: '#FBBF24' },
      },
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        toastIn: { from: { opacity: 0, transform: 'translateY(-8px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        pageIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        breathe: { '0%,100%': { opacity: 0.55 }, '50%': { opacity: 1 } },
      },
      animation: {
        toastIn: 'toastIn .22s ease-out',
        pageIn: 'pageIn .25s ease-out',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
