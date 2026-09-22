// tailwind.config.js
//
// Tokens ported from the Flutter app's lib/core/theme/app_theme.dart so the
// two products share one visual vocabulary.
//
// These are ADDITIVE and brand-named on purpose. An earlier draft overrode
// `teal`, `borderRadius` and `boxShadow` so that reaching for a Tailwind
// default produced the app's value. Measured against this codebase that would
// have broken 327 `teal-N` usages across 49 files (Tailwind REPLACES a colour
// scale rather than merging it), moved 232 radius call sites and re-weighted
// 102 shadows, including in Chat and Learning which no current sub-project
// touches. src/design/tokens.test.ts guards against reintroducing that.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00BFA5", light: "#5DF2D6", dark: "#008E76" }, // AppColors.primary
        banana: { DEFAULT: "#FFD54F", light: "#FFFF81", dark: "#C9A415" }, // AppColors.secondary
        surface: { DEFAULT: "#FFFFFF", dark: "#1E1E1E" },
        canvas: { DEFAULT: "#F8F9FA", dark: "#121212" },
        cardbg: { DEFAULT: "#FFFFFF", dark: "#2C2C2C" },
      },
      borderRadius: {
        card: "20px",  // AppRadius.xl
        chip: "12px",  // AppRadius.md
        sheet: "24px", // AppRadius.xxl
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.04)",       // AppShadows.sm
        raised: "0 2px 8px rgba(0,0,0,0.06)",     // AppShadows.md
        float: "0 4px 16px rgba(0,0,0,0.08)",     // AppShadows.lg
        brand: "0 6px 16px rgba(0,191,165,0.30)", // AppShadows.colored
      },
      keyframes: {
        "bt-rise": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        "bt-marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "bt-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "bt-shimmer": {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "bt-rise": "bt-rise .5s ease-out both",
        "bt-marquee": "bt-marquee 28s linear infinite",
        "bt-float": "bt-float 4s ease-in-out infinite",
        "bt-shimmer": "bt-shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
