/**
 * @jest-environment node
 */

// Jest 27's node sandbox has no global fetch, and creating the RTK Query api
// slice without one prints a console.warn. Stub it before the harness (and the
// app module graph behind it) is loaded, which is why the harness is required
// below rather than imported: ES imports hoist above this assignment.
(global as any).fetch = () => Promise.reject(new Error("no network in tests"));

/* eslint-disable @typescript-eslint/no-var-requires */
const { renderRoute } = require("./renderRoute");
const { PRERENDER_PATHS } = require("../publicRoutes");
const { SEO_PAGES, canonicalUrl } = require("../pages");

jest.setTimeout(30000);

// This is the same harness scripts/prerender.js runs at build time, executed
// here without a DOM so a component that reads window during render fails
// the suite, not the deploy.
describe.each(PRERENDER_PATHS)("prerender %s", (path: string) => {
  it("renders complete HTML with one h1 and route-specific head tags", async () => {
    const out = await renderRoute(path, { prefetch: false });
    expect(out.html.length).toBeGreaterThan(500);
    expect((out.html.match(/<h1[\s>]/g) || []).length).toBe(1);
    expect(out.head).toMatch(/<title[^>]*>[^<]+<\/title>/);

    const page = SEO_PAGES.find((p: any) => p.path === path);
    if (page) {
      expect(out.status).toBe(200);
      expect(out.head).toContain(`href="${canonicalUrl(page.path)}"`);
      expect((out.head.match(/rel="canonical"/g) || []).length).toBe(1);
      expect(out.head).toContain('name="description"');
      expect(out.head).not.toContain("noindex");
    } else {
      expect(out.status).toBe(404);
      expect(out.head).toContain("noindex");
    }
  });
});

it("emits no hydration script from the static router", async () => {
  const out = await renderRoute("/", { prefetch: false });
  expect(out.html).not.toContain("__staticRouterHydrationData");
});

it("shows the curated stat values, not a count-up starting at zero", async () => {
  const out = await renderRoute("/", { prefetch: false });
  expect(out.html).toContain(">137<");
  expect(out.html).toContain(">18<");
});
