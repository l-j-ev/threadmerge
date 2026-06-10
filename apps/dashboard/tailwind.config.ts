/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Nootro brand green — replaces the old blue brand ramp.
        brand: {
          DEFAULT: '#00c600',
          50: '#0a2e16',
          100: '#0e3a1d',
          300: '#2faa55',
          500: '#00c600',
          600: '#19d619',
          700: '#52ff52',
        },
        // Inverted gray ramp for dark theme: gray-50 = darkest surface,
        // gray-900 = near-white ink. Existing utilities flip correctly:
        // bg-gray-50 -> dark surface, text-gray-900 -> light text.
        gray: {
          50: '#0a150d',
          100: '#0e1a12',
          200: '#18271d',
          300: '#243a2c',
          400: '#4a5d51',
          500: '#6f8a7a',
          600: '#a7c4b2',
          700: '#c6ddcf',
          800: '#dcf2e5',
          900: '#eafff0',
        },
      },
    },
  },
  plugins: [],
};
