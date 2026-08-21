/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        maroon: { DEFAULT: "#1376B8", dark: "#07517F", light: "#248FCD" },
        gold: { DEFAULT: "#F6C94C", dark: "#DDAA24" },
        cardbg: "#F3F9FD",
        inktext: "#123047",
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', "Palatino", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
