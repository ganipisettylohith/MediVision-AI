/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        medical: {
          cyan: '#06b6d4',
          slate: '#0f172a',
          teal: '#14b8a6',
          darkBg: '#0b1329',
          darkCard: '#111d37',
          glowCyan: 'rgba(6, 182, 212, 0.15)',
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 15px 2px rgba(6, 182, 212, 0.3)',
        'glow-teal': '0 0 15px 2px rgba(20, 184, 166, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
