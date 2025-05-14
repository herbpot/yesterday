/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF6501",
        bgDark: "#1A1A1A",
      },
      borderRadius: {
        lg: "16px",
      },
      boxShadow: {
        card: "0 4px 8px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
