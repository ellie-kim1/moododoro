/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'; // Import the default theme for fallback fonts

export default {
  
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // 1. Define your new font utility class (font-fredoka)
        // 2. Specify the font name 'Fredoka'
        // 3. Add the default sans-serif fonts as a fallback
        fredoka: ['Fredoka', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};