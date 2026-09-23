/**
 * @jest-environment node
 */
// Runs without a DOM on purpose: the prerender step requires this module in
// plain Node, so importing it must never touch window, document or storage.
import { matchRoutes } from "react-router-dom";

// The prerender list is the source of truth for what counts as public; a
// hand-kept copy here drifted the moment /communities landed.
const PUBLIC_PATHS: string[] = require("../seo/pages").SEO_PAGES.map((p: { path: string }) => p.path);

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

// Since the app is split into route chunks, a navigation can fail: a chunk
// fetch that 404s (a tab left open across a deploy) rejects inside Suspense.
// Without an errorElement react-router replaces the whole app with its default
// stack-trace screen. This asserts the boundary is actually wired to the root
// route, where it catches every route below it.
it("puts an error boundary on the root route", () => {
  const { routes } = require("./routes");
  const RouteError = require("../components/errors/RouteError").default;
  expect(routes[0].errorElement).toBeTruthy();
  expect(routes[0].errorElement.type).toBe(RouteError);
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

// The profile redesign put one component on both profile paths. The element on
// each route is <Suspense><LazyThing /></Suspense>, and a lazy component keeps
// no record of what it will import -- so lazyWithRetry is swapped for a stub
// that hangs its sessionStorage key (the module path) on the component, which
// is the only thing that identifies the chunk without resolving the import.
function chunkKeysFor(paths: string[]): string[] {
  let keys: string[] = [];
  jest.isolateModules(() => {
    jest.doMock("./lazyWithRetry", () => ({
      lazyWithRetry: (key: string) => {
        const Stub: any = () => null;
        Stub.chunkKey = key;
        return Stub;
      },
    }));
    const { routes } = require("./routes");
    keys = paths.map((path) => {
      const matches = matchRoutes(routes, path);
      const element: any = matches![matches!.length - 1].route.element;
      return element.props.children.type.chunkKey;
    });
    jest.dontMock("./lazyWithRetry");
  });
  return keys;
}

it("renders the one profile page on both /profile and /profile/:userId", () => {
  const [own, other, edit] = chunkKeysFor(["/profile", "/profile/abc123", "/profile/edit"]);
  expect(own).toBe("../components/profile/ProfilePage");
  expect(other).toBe("../components/profile/ProfilePage");
  // The static segment still wins over the dynamic one.
  expect(edit).toBe("../components/profile/EditProfile");
});

// Followers, following and visitors are one page behind five paths: the three
// own-list paths every existing link already points at, and the two per-user
// paths the profile's stat tiles link to.
it("puts every follower/following/visitor path on the one list page", () => {
  const keys = chunkKeysFor([
    "/followersList",
    "/followingsList",
    "/visitors",
    "/profile/abc123/followers",
    "/profile/abc123/following",
  ]);
  for (const key of keys) {
    expect(key).toBe("../components/profile/UserListPage");
  }
});

// The per-user list paths are longer than "profile/:userId", so they must win
// over it -- otherwise /profile/abc123/followers renders the profile page.
it("ranks the per-user list paths above the profile route", () => {
  const { routes } = require("./routes");
  const matches = matchRoutes(routes, "/profile/abc123/followers");
  expect(matches![matches!.length - 1].route.path).toBe("profile/:userId/followers");
});

// /profile/:userId used to mount CommunityDetail through PublicProfile. The
// community route keeps it; the profile route must not.
it("leaves /community/:id on CommunityDetail", () => {
  const [community] = chunkKeysFor(["/community/abc123"]);
  expect(community).toBe("../components/community/CommunityDetail");
});
