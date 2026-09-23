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
const legacyCss = fs.readFileSync(
  path.resolve(__dirname, "../assets/styles/typography.css"),
  "utf8"
);
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

// rel="stylesheet" in <head> is render-blocking, and this one is a round trip
// to a third party on every prerendered page. Preload it and promote it on
// load instead, with a <noscript> copy so the fonts survive scripting-off.
it("requests the fonts without blocking first paint", () => {
  const link = (indexHtml.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/) || [""])[0];
  expect(link).toContain('rel="preload"');
  expect(link).toContain('as="style"');
  expect(link).toContain("this.rel='stylesheet'");
  expect(indexHtml).toMatch(
    /<noscript>[\s\S]*fonts\.googleapis\.com\/css2[\s\S]*<\/noscript>/
  );
});

// Weight 500 is the most-used non-default weight in the app; dropping it from
// the request makes the browser synthesise it, which thickens every label.
it("requests every Inter weight the app actually asks for", () => {
  const weights = (indexHtml.match(/family=Inter:wght@([\d;]+)/) || ["", ""])[1].split(";");
  for (const w of ["300", "400", "500", "600", "700", "800"]) {
    expect(weights).toContain(w);
  }
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

// A declared colour beats an inherited one, so a colour in the base heading
// rule is invisible on every dark surface that sets its own text colour
// (ChatSettings' h1 on #1a1a2e was 1.09:1). `body` colours the light ground;
// headings must inherit everywhere else.
it("does not colour headings in the base layer", () => {
  const bare = indexCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (bare.match(/h1,\s*\n?\s*h2,[\s\S]*?\n  \}/) || [""])[0];
  expect(rule).toContain("var(--bt-font-display)");
  expect(rule).not.toMatch(/(^|[^-])color:/);
});

// The focus ring has to clear 3:1 against what is behind it. Brand teal on
// white is 2.33:1; ink-950 is 18.6:1, and the dark surfaces flip it back.
it("draws a focus ring that contrasts with a light ground", () => {
  expect(indexCss).toMatch(/:focus-visible \{[^}]*outline: 2px solid var\(--bt-ink-950\)/);
  // border-radius in the focus rule reshapes the element, not the ring.
  expect(indexCss).not.toMatch(/:focus-visible \{[^}]*border-radius/);
  expect(indexCss).toMatch(/\.main-navbar :focus-visible[\s\S]{0,160}--bt-brand/);
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


// ---------------------------------------------------------------------------
// src/assets/styles/typography.css is imported from src/App.scss, so it loads
// after src/index.css AND after Tailwind's utilities. Anything in it that
// names an element or reuses a Tailwind utility class name therefore wins a
// fight it should not be in: `h1..h6 { font-family }` hid the display face,
// `p { color }` beat inherited white, and `.text-sm`/`.font-bold` and friends
// shadowed Tailwind's own utilities with different values. It is now
// variables plus genuinely custom classes, and stays that way.
// ---------------------------------------------------------------------------
describe("the legacy typography stylesheet", () => {
  // Selector lists, one per rule, with at-rules and declarations stripped.
  const selectors = legacyCss
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((chunk) => chunk.split("{")[0].trim())
    .filter((sel) => sel.length > 0 && !sel.startsWith("@"))
    .flatMap((sel) => sel.split(",").map((s) => s.trim()))
    .filter(Boolean);

  it("still defines the custom properties other stylesheets read", () => {
    for (const v of ["--color-primary", "--text-base", "--space-4", "--radius-lg"]) {
      expect(legacyCss).toContain(`${v}:`);
    }
  });

  it("keeps the classes Tailwind does not generate", () => {
    for (const cls of [
      ".section",
      ".section-sm",
      ".section-lg",
      ".caption",
      ".label",
      ".badge",
      ".btn",
      ".card-title",
      ".card-subtitle",
      ".card-text",
    ]) {
      expect(selectors).toContain(cls);
    }
  });

  it("styles no bare element", () => {
    const offenders = selectors.filter((sel) =>
      /^(html|body|h[1-6]|p|a|small|strong|ul|ol|li|button|input|textarea|select)\b/.test(sel)
    );
    expect(offenders).toEqual([]);
  });

  it("redefines no Tailwind utility class name", () => {
    const offenders = selectors.filter((sel) =>
      /^\.(text-(xs|sm|base|lg|xl|[2-4]xl|gray-\d{3}|primary)|font-(light|normal|medium|semibold|bold))\b/.test(sel)
    );
    expect(offenders).toEqual([]);
  });

  it("does not fetch a font family index.html already requests", () => {
    expect(legacyCss.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("@import");
  });
});
