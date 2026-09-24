import { buildNginxRoutesConf } from "./nginxRoutes";
import { routes } from "../../router/routes";
import { SEO_PAGES } from "../pages";

function alternation(conf: string): string[] {
  const m = conf.match(/^location ~ \^\/\(([^)]*)\)\(\/\|\$\) \{$/m);
  if (!m) throw new Error(`no location regex line in:\n${conf}`);
  return m[1].split("|");
}

const conf = buildNginxRoutesConf(routes as any);

it("emits one regex location covering the app's top-level route segments", () => {
  expect(conf).toMatch(/^location ~ \^\/\([^)]+\)\(\/\|\$\) \{$/m);
  expect(conf).toContain("try_files $uri $uri/index.html /app.html;");
  expect(conf).not.toContain("/index.html;");
  expect(conf.endsWith("\n")).toBe(true);
});

it("lists every real top-level segment", () => {
  const segs = alternation(conf);
  for (const expected of [
    "login", "register", "chat", "profile", "download", "moments", "communities",
    "settings", "stories", "support", "privacy-policy", "terms-of-use", "data-deletion",
  ]) {
    expect(segs).toContain(expected);
  }
});

it("never lists the catch-all or a dynamic segment", () => {
  const segs = alternation(conf);
  expect(segs).not.toContain("*");
  expect(conf).not.toContain("*");
  expect(segs.filter((s) => s.indexOf(":") >= 0)).toEqual([]);
  // Deduped and sorted, so the file is stable across builds.
  expect(segs).toEqual(Array.from(new Set(segs)).sort());
});

// Every prerendered page must also be reachable through the SPA fallback if its
// static file is ever missing, so its first segment has to be in the allowlist.
it("covers the first segment of every indexed page", () => {
  const segs = alternation(conf);
  for (const page of SEO_PAGES) {
    if (page.path === "/") continue;
    expect(segs).toContain(page.path.replace(/^\//, "").split("/")[0]);
  }
});

it("takes the first segment of each child, skipping the index, the splat and params", () => {
  const built = buildNginxRoutesConf([
    { path: "/", children: [{ index: true }, { path: "a" }, { path: "b/:id" }, { path: "*" }] },
  ] as any);
  expect(alternation(built)).toEqual(["a", "b"]);
});

it("refuses a segment that would need escaping in the regex", () => {
  expect(() => buildNginxRoutesConf([{ path: "/", children: [{ path: "a.b" }] }] as any)).toThrow();
});

it("names its generator so nobody hand-edits the output", () => {
  expect(conf).toContain("scripts/prerender.js");
  expect(conf).toContain("Do not edit");
});
