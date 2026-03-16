/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Snow UI Kit: main + right sidebar = #2D2D2D, left sidebar = #2C2C2C */
        dashboard: {
          bg: '#2D2D2D',
          surface: '#424242',
          sidebar: '#2C2C2C',
          card: '#2D2D2D',
          border: '#404040',
          muted: '#737373',
          /** KPI cards: light like Snow UI */
          metricCard: '#EBEBF0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
