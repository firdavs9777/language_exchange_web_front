import fs from "fs";
import path from "path";
import resolveConfig from "tailwindcss/resolveConfig";

// The type system is one decision, made in three places that have to agree:
// the font files are requested by public/index.html, the families are named by
// tailwind.config.js (so `font-sans` / `font-display` work), and src/index.css
// exposes them as CSS variables for the .scss files that don't use Tailwind
// (navbar, footer, community). Drift between the three is invisible in review
// and shows up as a fallback system font in production.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tailwindConfig = require(path.resolve(__dirname, "../../tailwind.config.js"));
const theme = (resolveConfig(tailwindConfig) as any).theme;

const indexCss = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf8");
const indexHtml = fs.readFileSync(path.resolve(__dirname, "../../public/index.html"), "utf8");

const UI_FAMILY = "Inter";
const DISPLAY_FAMILY = "Plus Jakarta Sans";

it("names one UI family and one display family", () => {
  expect(theme.fontFamily.sans[0]).toContain(UI_FAMILY);
  expect(theme.fontFamily.display[0]).toContain(DISPLAY_FAMILY);
});

it("always falls back to a system stack, never to the browser default serif", () => {
  for (const stack of [theme.fontFamily.sans, theme.fontFamily.display]) {
    expect(stack).toContain("system-ui");
    expect(stack[stack.length - 1]).toBe("sans-serif");
  }
});

it("loads both families, non-blocking, with the weights the UI uses", () => {
  const link = (indexHtml.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/) || [""])[0];
  expect(link).toContain(UI_FAMILY.replace(/ /g, "+"));
  expect(link).toContain(DISPLAY_FAMILY.replace(/ /g, "+"));
  // A blocking font request delays first paint on the prerendered pages.
  expect(link).toContain("display=swap");
  expect(indexHtml).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
});

it("exposes the families to the .scss files as CSS variables", () => {
  expect(indexCss).toContain("--bt-font-sans:");
  expect(indexCss).toContain("--bt-font-display:");
  expect(indexCss).toContain(UI_FAMILY);
  expect(indexCss).toContain(DISPLAY_FAMILY);
  // Geometric sans at small sizes needs grayscale smoothing to stay readable.
  expect(indexCss).toContain("-webkit-font-smoothing: antialiased");
});

it("gives headings the display family and optical tracking", () => {
  expect(indexCss).toMatch(/h1,\s*h2,\s*h3/);
  expect(indexCss).toContain("var(--bt-font-display)");
  expect(indexCss).toContain("letter-spacing");
});

// A neutral scale of its own: Tailwind's `gray` is cool-blue and reads cheap
// next to the teal brand. `ink` is the warmer slate the navbar/footer use.
it("adds an ink neutral scale without touching Tailwind's gray", () => {
  for (const step of ["50", "100", "200", "400", "600", "800", "900", "950"]) {
    expect(typeof theme.colors.ink[step]).toBe("string");
  }
  expect(theme.colors.ink["950"]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(theme.colors.gray["500"]).toBe("#6b7280");
});

it("keeps the brand palette and Tailwind's own scales intact", () => {
  expect(theme.colors.brand.DEFAULT).toBe("#00BFA5");
  expect(theme.colors.teal["500"]).toBe("#14b8a6");
  expect(theme.borderRadius.card).toBe("20px");
});
