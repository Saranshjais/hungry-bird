/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#FF5A5F', // Primary Coral
          600: '#e11d48',
          700: '#be123c',
        },
        surface: '#FFFFFF',
        background: '#F7F7F9',
        'text-dark': '#222222',
        'text-gray': '#717171',
      },
      fontFamily: {
        'manrope-regular': ['Manrope_400Regular', 'sans-serif'],
        'manrope-medium': ['Manrope_500Medium', 'sans-serif'],
        'manrope-semibold': ['Manrope_600SemiBold', 'sans-serif'],
        'manrope-bold': ['Manrope_700Bold', 'sans-serif'],
        'manrope-extrabold': ['Manrope_800ExtraBold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
