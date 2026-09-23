/**
 * @jest-environment node
 */
// Runs without a DOM on purpose: the prerender step requires this module in
// plain Node, so importing it must never touch window, document or storage.
import { matchRoutes } from "react-router-dom";

const PUBLIC_PATHS = [
  "/", "/download", "/meet", "/learn-korean", "/moments", "/privacy-policy", "/terms-of-use",
  "/support", "/data-deletion",
];

it("imports without a DOM", () => {
  expect(typeof window).toBe("undefined");
  const { routes } = require("./routes");
  expect(routes[0].path).toBe("/");
  expect(routes[0].children.length).toBeGreaterThan(30);
});

it("matches every public marketing path to a layout plus a page", () => {
  const { routes } = require("./routes");
  for (const path of PUBLIC_PATHS) {
    const matches = matchRoutes(routes, path);
    expect(matches && matches.length).toBe(2);
    expect(matches![1].route.path).not.toBe("*");
  }
});

it("sends unknown paths to the catch-all route", () => {
  const { routes } = require("./routes");
  const matches = matchRoutes(routes, "/no-such-page");
  expect(matches && matches.length).toBe(2);
  expect(matches![1].route.path).toBe("*");
});

// The admin console is a lazy child tree. It must resolve to real routes (not
// the catch-all) while still importing in plain Node: React.lazy defers the
// import until something renders it, and nothing prerenders /admin.
it("matches the admin console paths to real routes, not the catch-all", () => {
  const { routes } = require("./routes");
  for (const path of ["/admin", "/admin/reach", "/admin/users", "/admin/content", "/admin/ai-usage", "/admin/audit"]) {
    const matches = matchRoutes(routes, path);
    expect(matches && matches.length).toBe(3); // App -> AdminLayout -> page
    for (const m of matches!) {
      expect(m.route.path).not.toBe("*");
    }
  }
});
