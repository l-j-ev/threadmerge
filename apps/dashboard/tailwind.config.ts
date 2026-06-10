/** @type {import('tailwindcss').Config} */

// Nootro brand green — reused for every "accent" scale so stray
// blue/indigo/sky utilities in the views also resolve to green.
const greenRamp = {
  DEFAULT: '#00c600',
  50: '#0a2e16',
  100: '#0e3a1d',
  200: '#13502a',
  300: '#2faa55',
  400: '#19d619',
  500: '#00c600',
  600: '#19d619',
  700: '#52ff52',
  800: '#7dff7d',
  900: '#aaffaa',
};

// Dark-theme neutral ramp. 50–300 are dark (surfaces/borders);
// 400–900 are progressively lighter TEXT tones, all readable on the
// near-black background. (A naive inversion makes 400–500 too dim.)
const grayRamp = {
  50: '#0a150d',
  100: '#0e1a12',
  200: '#18271d',
  300: '#2b4133',
  400: '#88a294',
  500: '#a0bbac',
  600: '#bad2c4',
  700: '#d2e7da',
  800: '#e2f6ea',
  900: '#eafff0',
};

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: greenRamp,
        blue: greenRamp,
        sky: greenRamp,
        indigo: greenRamp,
        gray: grayRamp,
        slate: grayRamp,
      },
    },
  },
  plugins: [],
};