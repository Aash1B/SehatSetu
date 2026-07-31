/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'luster-white': '#F4F1EC',
        'aster-blue': '#9BACD8',
        'habanero': '#F98513',
        'jodhpur-tan': '#DAD1C8',
        'deep-space': '#223382',
        'deadly-depths': '#111144',
      },
    },
  },
  plugins: [],
}
