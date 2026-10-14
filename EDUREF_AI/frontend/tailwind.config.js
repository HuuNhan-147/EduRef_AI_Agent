/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgb(32 39 46 / 5%)',
        '2xs': '0 1px 2px rgb(32 39 46 / 3%)',
      },
      colors: {
        eduref: {
          canvas: 'var(--eduref-canvas)',
          primary: 'rgb(var(--eduref-primary-rgb) / <alpha-value>)',
          hover: 'var(--eduref-primary-hover)',
          tint: 'var(--eduref-tint)',
          text: 'var(--eduref-text)',
          muted: 'var(--eduref-muted)',
        },
        institutional: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
