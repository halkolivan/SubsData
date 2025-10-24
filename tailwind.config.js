/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        jura: ['"Jura"', 'sans-serif'],
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      custom: "1093px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [],
};
