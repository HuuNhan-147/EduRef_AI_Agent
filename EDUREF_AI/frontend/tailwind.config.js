/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-soft': 'rgb(var(--surface-soft) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-soft) / <alpha-value>)',
        foreground: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        'text-primary': 'rgb(var(--text) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'text-subtle': 'rgb(var(--text-subtle) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-strong': 'rgb(var(--primary-strong) / <alpha-value>)',
        accent: 'rgb(var(--primary-strong) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        attention: 'rgb(var(--attention) / <alpha-value>)',
        warning: 'rgb(var(--attention) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        reasoning: 'rgb(var(--reasoning) / <alpha-value>)',
        focus: 'rgb(var(--focus) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        'ui-border': 'rgb(var(--border) / <alpha-value>)',
        'ui-border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        institutional: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      boxShadow: {
        panel: 'var(--panel-shadow)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 180ms ease-out both',
      },
    },
  },
  plugins: [],
}
