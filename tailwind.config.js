/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5347CE',
          light: '#8B7CFD',
        },
        secondary: {
          DEFAULT: '#4B6BFE',
          light: '#16CBC7',
        },
        background: {
          light: '#F8F9FD',
          dark: '#F3F4F6',
        }
      },
      fontFamily: {
        sans: ['SF Pro Display', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};