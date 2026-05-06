// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8337c8',
          50:  '#f5eeff',
          100: '#ead9ff',
          200: '#d4b3ff',
          300: '#b980ff',
          400: '#9f55e8',
          500: '#8337c8',
          600: '#6a23a8',
          700: '#531588',
          800: '#3c0d68',
          900: '#270648',
        },
        pink: {
          brand: '#d94a7d',
        },
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body:    ['Ubuntu', 'sans-serif'],
      },
      backgroundImage: {
        'vgx-gradient': 'linear-gradient(135deg, #8337c8 0%, #d94a7d 100%)',
      },
    },
  },
  plugins: [],
}
