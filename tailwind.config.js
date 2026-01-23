/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        young: ['"Be Vietnam Pro"', 'Inter', 'sans-serif'],
      },
      colors: {
        'young-orange': '#fe5009',
        'young-orange-hover': '#e04808',
      },
    },
  },
  plugins: [],
}