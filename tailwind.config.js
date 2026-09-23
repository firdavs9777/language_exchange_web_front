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
        // `deep` is the accessible member of the family: white text on
        // #00BFA5 is 2.33:1 and on #008E76 is 4.09:1, both under AA. #00806A
        // clears it at 4.89:1, so any brand fill that carries small white
        // text uses `deep`; DEFAULT and `dark` stay for large or decorative
        // fills.
        brand: { DEFAULT: "#00BFA5", light: "#5DF2D6", dark: "#008E76", deep: "#00806A", deepest: "#00654F" }, // AppColors.primary
        banana: { DEFAULT: "#FFD54F", light: "#FFFF81", dark: "#C9A415" }, // AppColors.secondary
        surface: { DEFAULT: "#FFFFFF", dark: "#1E1E1E" },
        canvas: { DEFAULT: "#F8F9FA", dark: "#121212" },
        cardbg: { DEFAULT: "#FFFFFF", dark: "#2C2C2C" },
        // Neutral scale of our own. Tailwind's `gray` is cool-blue and reads
        // cheap beside the teal brand; `ink` is a degree warmer and goes
        // deeper at the top end, which is what gives the navbar and footer
        // their weight. Additive -- `gray-N` is untouched.
        ink: {
          50: "#F7F8FA",
          100: "#EEF1F5",
          200: "#DFE4EB",
          300: "#C7CFDA",
          400: "#98A3B4",
          500: "#6B7686",
          600: "#4E5868",
          700: "#3A4352",
          800: "#262E3B",
          900: "#171E29",
          950: "#0D131C",
        },
        // Hairlines. A border is not a light gray text colour; naming it
        // stops the two from being swapped by accident.
        line: { DEFAULT: "#E5E9F0", strong: "#D3DAE4", dark: "#2F3641" },
      },
      fontFamily: {
        // Inter for UI text (tall x-height, real tabular figures), Plus Jakarta
        // Sans for headings (geometric, a little more character than Inter at
        // display sizes without turning playful). Loaded in public/index.html.
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
        ],
        display: [
          '"Plus Jakarta Sans"',
          "Inter",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      fontSize: {
        // Display sizes only. The body scale stays Tailwind's so no existing
        // `text-sm` moves. Tracking tightens as size grows -- large type set at
        // 0 tracking looks loose, which is the single most common tell of an
        // un-designed page.
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.14em" }],
        "display-sm": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.018em" }],
        "display-md": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.024em" }],
        "display-lg": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.028em" }],
        "display-xl": ["3.5rem", { lineHeight: "1.06", letterSpacing: "-0.032em" }],
        "display-2xl": ["4.5rem", { lineHeight: "1.02", letterSpacing: "-0.036em" }],
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
        // Wide, low-opacity and offset downward: reads as elevation rather
        // than as a grey outline, which is what the old flat shadows did.
        lift: "0 10px 30px -12px rgba(13,19,28,0.18)",
        glass: "0 8px 32px -8px rgba(13,19,28,0.24)",
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
