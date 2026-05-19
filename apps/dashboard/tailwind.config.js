/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0078d4',
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0078d4',
          600: '#0067b8',
          700: '#005a9e',
        },
      },
    },
  },
  plugins: [],
};
