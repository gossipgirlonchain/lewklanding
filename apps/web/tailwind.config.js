/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        jaoren: ['Jaoren', 'sans-serif'],
      },
    },
  },
  plugins: [],
}