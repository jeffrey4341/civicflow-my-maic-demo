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
        flag: {
          blue: "#010066",
          red: "#cc0001",
          gold: "#ffcc00",
        },
        // Actor identity colours for the audit timeline — single source of truth
        // (consumed via ACTOR_DOT in src/components/ui.tsx).
        actor: {
          citizen: "#0ea5e9", // sky-500
          ai: "#2c8782", // civic-500
          system: "#94a3b8", // slate-400
          officer: "#6366f1", // indigo-500
          supervisor: "#f97316", // orange-500
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      // Named small-text steps so components stop using arbitrary text-[Npx] values.
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px — fine print / decorative meta
        xxs: ["0.6875rem", { lineHeight: "1rem" }], // 11px — dense metadata
      },
      maxWidth: {
        phone: "26rem",
      },
    },
  },
  plugins: [],
};

export default config;
