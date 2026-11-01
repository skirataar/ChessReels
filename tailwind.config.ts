import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#151413",
        surface: "#22201e",
        accent: {
          DEFAULT: "#c29b78",
          gold: "#c29b78",
          hover: "#d4b08f",
        },
        offwhite: "#f5f5f5",
        mutedgrey: "#a3a3a3",
        success: "#10b981",
        error: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
