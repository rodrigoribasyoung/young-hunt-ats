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
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#fe5009',
          cyan: '#00bcbc',
          dark: '#0f172a',    // Fundo Principal (dark)
          card: '#1e293b',    // Fundo dos Cards (dark)
          hover: '#334155',   // Hover state (dark)
          border: '#475569',  // Bordas (dark)
        }
      }
    },
  },
  // Adiciona suporte para light mode nas cores brand
  // As cores serão sobrescritas via CSS quando não estiver em dark mode
  plugins: [],
}