import fs from "fs";
import path from "path";

// Community is the surface people spend the most time on, and the one most
// likely to be restyled. These are static guards, not render tests: they stop
// the design from leaking back into the component as inline styles, where no
// stylesheet, no theme and no hover state can reach it.

const tsx = fs.readFileSync(path.join(__dirname, "MainCommunity.tsx"), "utf8");
const scss = fs.readFileSync(path.join(__dirname, "tandem/tandem-community.scss"), "utf8");

it("keeps colours out of the component -- no hardcoded hex in an inline style", () => {
  const inlineStyles = tsx.match(/style=\{\{[\s\S]*?\}\}/g) || [];
  const withHex = inlineStyles.filter((s) => /#[0-9a-fA-F]{3,8}\b/.test(s));
  expect(withHex).toEqual([]);
});

it("styles the empty and error actions from the stylesheet", () => {
  expect(scss).toContain(".community-empty__action");
  expect(tsx).toContain("community-empty__action");
});

it("uses the shared type tokens rather than its own system font stack", () => {
  expect(scss).toContain("var(--bt-font-sans)");
  expect(scss).not.toContain("-apple-system, BlinkMacSystemFont");
});

it("still ships the class names the member list depends on", () => {
  for (const cls of [".community-page", ".community-empty", ".community-loadmore", ".tandem-member-card"]) {
    expect(scss).toContain(cls);
  }
});
