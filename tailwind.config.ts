import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#0D0D0D",
        card: "#141414",
        "card-hover": "#1A1A1A",
        border: "#1F1F1F",
        "border-hover": "#2A2A2A",
        text: "#E0E0E0",
        "text-muted": "#888888",
        "text-dim": "#555555",
        accent: "#00FF88",
        "accent-dim": "#00CC6A",
        "accent-glow": "rgba(0, 255, 136, 0.15)",
        danger: "#FF4444",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(0, 255, 136, 0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 40px rgba(0, 255, 136, 0.2)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
