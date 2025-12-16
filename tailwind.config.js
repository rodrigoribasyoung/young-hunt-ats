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
        // Cores universais que funcionam bem em dark/light mode
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb',    // blue-600
          light: '#60a5fa',   // blue-400
        },
        secondary: {
          DEFAULT: '#64748b', // slate-500
          dark: '#475569',    // slate-600
          light: '#94a3b8',   // slate-400
        },
        // Mantém compatibilidade com código existente
        brand: {
          orange: '#3b82f6',  // Usa blue como padrão
          cyan: '#64748b',    // Usa slate como padrão
          dark: '#0f172a',    
          card: '#1e293b',    
          hover: '#334155',   
          border: '#475569',  
        }
      }
    },
  },
  // Adiciona suporte para light mode nas cores brand
  // As cores serão sobrescritas via CSS quando não estiver em dark mode
  plugins: [],
}