import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CivicFlow MY palette — calm civic teal + Malaysian-flag-inspired accents.
        civic: {
          50: "#eef7f6",
          100: "#d6ecea",
          200: "#aedad6",
          300: "#7cc1bc",
          400: "#48a39e",
          500: "#2c8782",
          600: "#226c69",
          700: "#1d5754",
          800: "#1a4644",
          900: "#173b3a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
};

export default config;
