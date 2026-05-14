/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: 'var(--admin-bg)',
          surface: 'var(--admin-surface)',
          sidebar: 'var(--admin-sidebar)',
          card: 'var(--admin-card)',
          border: 'var(--admin-border)',
          muted: 'var(--admin-muted)',
          metricCard: '#EBEBF0',
        },
        admin: {
          primary: 'var(--admin-primary)',
          success: 'var(--admin-success)',
          warning: 'var(--admin-warning)',
          danger: 'var(--admin-danger)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
