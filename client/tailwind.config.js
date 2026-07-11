/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      primary: "#4F46E5", // Indigo-600
      secondary: "#0F172A", // Slate-900
      accent: "#F43F5E", // Rose-500
      success: "#10B981", // Emerald-500
      warning: "#F59E0B", // Amber-500
      danger: "#EF4444", // Red-500
      background: "#F9FAFB", // Gray-50
      surface: "#FFFFFF",
      white: "#FFFFFF",
      black: "#000000",
      gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
      },
    },
  },
  plugins: [],
}
