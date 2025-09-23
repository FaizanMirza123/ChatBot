/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#6d4aff', // purple-ish used in screenshot buttons
        },
        sidebar: '#0f0f12',
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [],
}
