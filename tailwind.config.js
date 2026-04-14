/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          DEFAULT: "#faf9f6",
          dark: "#f0ede7",
        },
        stone: {
          DEFAULT: "#8b8578",
          light: "#b5b0a5",
          dark: "#6b665c",
        },
        sea: {
          DEFAULT: "#4a6d7c",
          light: "#6b8e9c",
          dark: "#3a5563",
        },
        moss: {
          DEFAULT: "#5a6e4e",
          light: "#7a8e6e",
          dark: "#445438",
        },
        amber: {
          DEFAULT: "#c4973b",
          light: "#d4ad5b",
          dark: "#a47d2b",
        },
        rust: {
          DEFAULT: "#a15d3a",
          light: "#c17d5a",
          dark: "#814d2a",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
