# Phase A — Reach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public BananaTalk page carry its own metadata, ship as static HTML a crawler can read, be listed in a truthful sitemap, answer dead URLs correctly, and be measured (GA4 behind consent plus first-party events) with a learner count that comes from the backend.

**Architecture:** The route tree moves out of `createBrowserRouter` into a shared `routes.tsx` so the same tree renders both in the browser (`RouterProvider`, hydrating) and at build time (`createStaticHandler`/`createStaticRouter`/`StaticRouterProvider` under `renderToString`). Per-route `<head>` tags come from `react-helmet-async` driven by a single metadata table (`src/seo/pages.ts`). A post-build Node script renders each public route into `build/<path>/index.html` and writes the sitemap; it fails the build on any thrown error, missing `<h1>`, or render-time browser-global access, and only warns on data-fetch failure. Measurement is a consent-gated GA4 loader plus a first-party `POST /api/v1/analytics/events`; the learner count is `GET /api/v1/public/stats`.

**Tech Stack:** React 18.3, react-router-dom 6.23.1 (data router + `react-router-dom/server`), react-helmet-async 1.3.0, RTK Query (`@reduxjs/toolkit` 2.x), react-i18next 13 / i18next 23, CRA `react-scripts` 5.0.1 (Jest 27, jsdom + node environments), TypeScript 3.7.2, `@babel/register` + `babel-preset-react-app` 10 for the build-time renderer, Tailwind 3.4. Backend: Express, Mongoose, `express-rate-limit` 6, `node:test` + `supertest` + `mongodb-memory-server`.

**Spec:** `/Users/davis/Desktop/Personal/language_exchange_web_front/docs/superpowers/specs/2026-09-22-reach-marketing-admin-design.md` (§3, §4, §7.1, §7.3, §8, §9, §11). Phases B and C get their own plans; backend endpoints §7.2, §7.4, §7.5 ship with the phase that consumes them.

## Global Constraints

- TypeScript is **3.7.2**: `?.` and `??` are fine; **no** `import type` / `export type {}` (3.8), no template-literal types, no `satisfies`; `as const` is fine. `npx tsc` is unusable; `react-scripts build` is the type check.
- Node on the build machine caps at a 1GB heap (`npm run deploy` sets `--max-old-space-size=1024`); the prerender step runs in the same process budget after the webpack build finishes.
- Copy idiom: `t("key") || "English fallback"` — i18n returns `""` on a miss (`parseMissingKeyHandler`). Every new key goes to `eng.json` **and** the 17 other locale files (`ar de es fr hi id it ja kor pt ru th tl tr vi zh_TW zho`).
- Public pages never depend on the backend to render: every data consumer branches on `!data`, never `isLoading` (an unsubscribed RTK Query hook reports `isUninitialized`, `data === undefined` on the server).
- Components on public routes read `window`/`document`/`navigator`/`localStorage`/`matchMedia` only inside effects or behind `typeof x === "undefined"` guards. The prerender process **deletes** Node's `navigator`, `localStorage` and `sessionStorage` globals so any render-time access throws a `ReferenceError` naming the route (this is the spec's "Proxy on globalThis" implemented feasibly: a throwing getter would break `typeof` guards, an absent binding does not).
- Canonical origin is `https://banatalk.com`; canonical URLs carry no query string; the site-wide OG image is the existing `/og-image.png`.
- Frontend tests run with `CI=true npx react-scripts test --watchAll=false`; backend tests with `node --test test/<file>.test.js` from the backend root.
- Frontend repo root: `/Users/davis/Desktop/Personal/language_exchange_web_front`. Backend repo root: `/Users/davis/Desktop/Personal/language_exchange_backend_application`. All paths below are relative to the repo named in the task.
- Commit after every task; commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. The frontend working tree already has unrelated modified files (`MainNavbar.*`, 18 locale files, three untracked tests) — stage only the files each task names.
- Existing behaviour to preserve: `POST /api/v1/analytics/visit` in `App.tsx` stays exactly as it is; `public/index.html`'s four JSON-LD blocks stay as the site-wide fallback.

## File Structure

**Frontend — created**

| File | Responsibility |
|---|---|
| `src/router/routes.tsx` | The route tree (`createRoutesFromElements(...)`) as a `RouteObject[]`, plus `MainChatWrapper`. Imported by the browser router and the prerenderer. |
| `src/seo/pages.ts` | Metadata table: one `SeoPage` per indexed route, keyword map, `SITE_ORIGIN`, `getPage`, `englishOf`. |
| `src/seo/publicRoutes.ts` | `PUBLIC_ROUTES` (prerendered paths, derived from `pages.ts` minus dynamic routes, plus `/404`) and `PREFETCH` (which data each path needs at build time). |
| `src/seo/PageMeta.tsx` | Renders `<Helmet>` for a route entry (title, description, canonical, robots, OG, Twitter, JSON-LD) or the `noindex` form. |
| `src/prerender/renderRoute.tsx` | Pure harness: `renderRoute(path, opts)` → `{ html, head }` using the static router; prefetch; loud checks. No file I/O. |
| `src/prerender/template.ts` | `injectIntoTemplate(template, { html, head })` — replaces `#root`, strips superseded static tags, inserts helmet head. |
| `src/prerender/sitemap.ts` | `buildSitemap(paths, lastmod)` → XML string. |
| `src/bootstrap/chooseRenderer.ts` | `chooseRenderer(el)` → `"hydrate" | "create"`. |
| `src/analytics/consent.ts` | `readConsent` / `writeConsent` over `bt.consent`. |
| `src/analytics/ga.ts` | `getGaId`, `loadGa`, `gaEvent`, `isGaLoaded`. |
| `src/analytics/track.ts` | `trackEvent`, `buildPayload`, `getSessionId` → `POST /api/v1/analytics/events`. |
| `src/analytics/usePageViews.ts` | Hook: fires `page_view` (first-party + GA) on pathname change. |
| `src/components/growth/ConsentBar.tsx` | Bottom consent bar; mounts client-only; hides while the download popup is open. |
| `src/store/slices/publicStatsSlice.ts` | RTK Query endpoint `getPublicStats`. |
| `scripts/register.js` | Node require hooks: deletes browser-ish globals, loads CRA env, `@babel/register` with `babel-preset-react-app`, style/asset stubs mapped to `build/static/media`. |
| `scripts/prerender.js` | CLI: renders `PUBLIC_ROUTES` into `build/`, writes `build/sitemap.xml`, exits non-zero on failure. |
| `scripts/merge-locales.js` | Deep-merges a `{ locale: { ...keys } }` JSON file into `src/utils/locales/*.json`. |
| `deploy/nginx.snippet.conf` | 404 page, 301s, 410s, SPA fallback. |
| `README.md` | Deploy section documenting build, prerender and the nginx snippet. |

**Frontend — modified**

| File | Change |
|---|---|
| `src/router/AppRouter.tsx` | Becomes `createBrowserRouter(routes)`. |
| `src/index.tsx` | `HelmetProvider`; `hydrateRoot` vs `createRoot` via `chooseRenderer`. |
| `src/App.tsx` | Default `<PageMeta noindex>`; `usePageViews()`; `applyDetectedLanguage()` effect; `<ConsentBar />`. |
| `src/store/index.ts` | Adds `createAppStore()`; the default export stays the singleton. |
| `src/store/slices/authSlice.ts` | Guards the module-level `localStorage` read. |
| `src/utils/i18n.ts` | `lng: "en"`, `detection.caches: []`, exports `applyDetectedLanguage`, `rememberLanguageChoice`; geo probe moves into `applyDetectedLanguage`. |
| `src/components/navbar/MainNavbar.tsx`, `src/components/settings/LanguageSettings.tsx` | Call `rememberLanguageChoice` on explicit user choice. |
| `src/components/linking/AppBanner.tsx`, `src/components/growth/StickyAppBanner.tsx`, `src/components/growth/PromoCarousel.tsx` | Browser reads move from render/initializer into effects. |
| `src/components/growth/growthGate.ts`, `src/components/growth/AppDownloadPopup.tsx` | Popup-open signal for the consent bar. |
| `src/components/navbar/TermsOfUse.tsx` | `h2` → `h1`. |
| `src/components/error/NotFound.tsx` | Real 404 page (spec names `errors/`; the existing `error/` directory is kept). |
| `src/components/home/HomeMain.tsx`, `download/DownloadApp.tsx`, `moments/MomentsAppPromo.tsx`, `navbar/PrivacyPolicy.tsx`, `navbar/TermsOfUse.tsx`, `support/SupportMain.tsx`, `navbar/DataDeletion.tsx`, `community/CommunityDetail.tsx` | Render `<PageMeta route=… />`. |
| `src/components/home/parts/StatStrip.tsx` | Learner count from `getPublicStats`. |
| `src/components/footer/FooterMain.tsx` | Dead links fixed. |
| `src/constants.ts` | `PUBLIC_STATS_URL`, `ANALYTICS_EVENTS_URL`. |
| `public/index.html`, `public/manifest.json` | hreflang removed, "137 Languages", `theme_color`. |
| `public/sitemap.xml` | Deleted (generated at build). |
| `package.json` | `build` runs the prerender; new deps. |
| `src/utils/locales/*.json` (18) | New namespaces `seo`, `notFound`, `consent`; new keys under `footer.links`, `home.stats`. |

**Backend — created:** `models/WebEvent.js`, `controllers/publicStats.js`, `routes/public.js`, `test/webEvents.test.js`, `test/publicStats.test.js`.
**Backend — modified:** `routes/analytics.js` (adds `POST /events`), `middleware/rateLimiter.js` (adds `eventsLimiter`), `server.js` (mounts `/api/v1/public`).

---

### Task 1: Extract the route tree into `routes.tsx`

**Files:**
- Create: `src/router/routes.tsx`
- Modify: `src/router/AppRouter.tsx`
- Test: `src/router/routes.test.tsx`

**Interfaces:**
- Produces: `export const routes: RouteObject[]` (from `createRoutesFromElements`), `export function collectPaths(routes: RouteObject[], parent?: string): string[]` (every concrete `path` in the tree, leading slash, no trailing slash; the root `"/"` included; the catch-all appears as `"/*"`). `AppRouter.tsx` default export stays `createBrowserRouter(routes)`.
- Why: `createBrowserRouter` touches `window` at import time and hides the tree from a static renderer. The prerenderer (Task 12) imports `routes`, never `AppRouter`.

- [ ] **Step 1: Write the failing test (runs in the Node environment so import-time browser access is caught)**

```tsx
// src/router/routes.test.tsx
/**
 * @jest-environment node
 */
// Importing the tree in a plain Node context is the point: any route module
// that touches window/document/localStorage at import time explodes here,
// long before the prerenderer would trip on it.
import { routes, collectPaths } from "./routes";

it("exports a single root layout with child routes", () => {
  expect(routes).toHaveLength(1);
  expect(routes[0].path).toBe("/");
  expect((routes[0].children || []).length).toBeGreaterThan(30);
});

it("collectPaths lists every public page the spec indexes", () => {
  const paths = collectPaths(routes);
  ["/", "/download", "/moments", "/privacy-policy", "/terms-of-use", "/support",
   "/data-deletion", "/profile/:userId", "/communities", "/login"]
    .forEach((p) => expect(paths).toContain(p));
});

it("normalises the trailing slashes the tree declares", () => {
  const paths = collectPaths(routes);
  expect(paths).not.toContain("/privacy-policy/");
  expect(paths.filter((p) => p === "/privacy-policy")).toHaveLength(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/router/routes.test.tsx`
Expected: FAIL — `Cannot find module './routes'`.

- [ ] **Step 3: Create `src/router/routes.tsx` by moving the tree out of `AppRouter.tsx`**

Move every `import` of a page component and the `MainChatWrapper` component from `AppRouter.tsx` into this file verbatim, then export the tree:

```tsx
// src/router/routes.tsx
import { createRoutesFromElements, Route, RouteObject, useParams } from "react-router-dom";
import App from "../App";
import HomeScreen from "../components/home/HomeMain";
import MainCommnity from "../components/community/MainCommunity";
import Login from "../components/auth/Login";
import MomentsAppPromo from "../components/moments/MomentsAppPromo";
import Register from "../components/auth/Register";
import MomentDetail from "../components/moments/MomentDetail";
import CreateMoment from "../components/moments/CreateMoment";
import ProfileScreen from "../components/profile/Profile";
import PublicProfile from "../components/profile/PublicProfile";
import CoursesMain from "../components/courses/CoursesMain";
import CommunityDetail from "../components/community/CommunityDetail";
import UserFollowersList from "../components/profile/UserFollowers";
import UserFollowingList from "../components/profile/UserFollowing";
import UserVisitorsList from "../components/profile/UserVisitors";
import MyMoments from "../components/profile/MyMoments";
import EditProfile from "../components/profile/EditProfile";
import MainChat from "../components/chat/MainChat";
import ForgetPassword from "../components/auth/ForgetPassword";
import AuthCallback from "../components/auth/AuthCallback";
import EditMyMoment from "../components/profile/EditMyMoment";
import MainStories from "../components/stories/MainStories";
import PrivacyPolicy from "../components/navbar/PrivacyPolicy";
import DataDeletion from "../components/navbar/DataDeletion";
import SupportPage from "../components/support/SupportMain";
import TermsOfUse from "../components/navbar/TermsOfUse";
import DownloadApp from "../components/download/DownloadApp";
import Settings from "../components/settings/Settings";
import PrivacySettings from "../components/settings/PrivacySettings";
import NotificationSettings from "../components/settings/NotificationSettings";
import VipSettings from "../components/settings/VipSettings";
import LanguageSettings from "../components/settings/LanguageSettings";
import BlockedUsers from "../components/settings/BlockedUsers";
import CloseFriends from "../components/settings/CloseFriends";
import NearbyUsers from "../components/community/NearbyUsers";
import Waves from "../components/community/Waves";
import Topics from "../components/community/Topics";
import NewChat from "../components/chat/NewChat";
import ChatSettings from "../components/chat/ChatSettings";
import MediaGallery from "../components/chat/MediaGallery";
import Highlights from "../components/stories/Highlights";
import CreateStory from "../components/stories/CreateStory";
import StoryViewer from "../components/stories/StoryViewer";
import SavedMoments from "../components/moments/SavedMoments";

const MainChatWrapper = () => {
  const { userId } = useParams();
  return <MainChat key={userId || "no-user"} />;
};

/**
 * The one route tree. `AppRouter.tsx` wraps it in createBrowserRouter for the
 * browser; `src/prerender/renderRoute.tsx` wraps it in createStaticRouter at
 * build time. Keep every <Route> here — a route declared anywhere else is
 * invisible to the prerenderer and the SEO tests.
 */
export const routes: RouteObject[] = createRoutesFromElements(
  <Route path="/" element={<App />}>
    {/* paste the existing children of <Route path="/"> from AppRouter.tsx here, unchanged */}
  </Route>
);

/** Every concrete path in the tree, "/"-prefixed, trailing slash stripped. */
export function collectPaths(tree: RouteObject[], parent: string = ""): string[] {
  const out: string[] = [];
  for (const r of tree) {
    let full = parent;
    if (r.path) {
      const seg = r.path.replace(/^\/+/, "");
      full = seg === "" ? "/" : `${parent === "/" ? "" : parent}/${seg}`;
      full = full.length > 1 ? full.replace(/\/+$/, "") : full;
      out.push(full);
    }
    if (r.children) out.push(...collectPaths(r.children, full || parent));
  }
  return out;
}
```

The comment `paste the existing children` is an instruction to you, the implementer: the JSX children are the block from `<Route index element={<HomeScreen />} />` through `<Route path="moments/saved" element={<SavedMoments />} />` in the current `AppRouter.tsx`, copied byte-for-byte (including the existing comments and the trailing-slash paths such as `privacy-policy/` — `collectPaths` normalises them).

- [ ] **Step 4: Reduce `AppRouter.tsx` to the browser router**

Replace the whole file with:

```tsx
// src/router/AppRouter.tsx
import { createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";

// Browser-only: createBrowserRouter reads window at import. Nothing that can
// run in Node (tests in the node environment, scripts/prerender.js) may import
// this file — import ./routes instead.
const AppRouter = createBrowserRouter(routes);

export default AppRouter;
```

- [ ] **Step 5: Run the test**

Run: `CI=true npx react-scripts test --watchAll=false src/router/routes.test.tsx`
Expected: PASS. If it fails with `ReferenceError: window is not defined` / `localStorage is not defined` / `document is not defined`, the stack names a module that reads a browser global at import time. Fix that module by wrapping the read in `typeof window === "undefined" ? <neutral default> : …` (Task 2 already does this for `authSlice.ts`, the one known offender; do Task 2's Step 3 now if that is the failure, then re-run). Do not mark this task done until it passes.

- [ ] **Step 6: Run the whole suite to make sure the router still works in the browser tests**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS (same pass count as before plus 3).

- [ ] **Step 7: Commit**

```bash
git add src/router/routes.tsx src/router/routes.test.tsx src/router/AppRouter.tsx
git commit -m "refactor(router): extract route tree to routes.tsx for static rendering

createBrowserRouter touches window at import and hid the tree from any
static renderer. The tree now lives in routes.tsx; AppRouter.tsx only wraps
it for the browser. A node-environment test imports the tree so import-time
browser access fails here, not in the build.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Store factory and the `authSlice` storage guard

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/slices/authSlice.ts:48-66`
- Test: `src/store/createAppStore.test.ts`

**Interfaces:**
- Produces: `export function createAppStore()` returning a fresh configured store with the same reducers/middleware as the singleton; `export type AppStore = ReturnType<typeof createAppStore>`; `export type AppDispatch = AppStore["dispatch"]`. Default export remains the singleton store (used by `index.tsx`).
- Consumed by: Task 12 (`renderRoute` makes one store per rendered route).

- [ ] **Step 1: Write the failing test**

```ts
// src/store/createAppStore.test.ts
/**
 * @jest-environment node
 */
import { createAppStore } from "./index";

it("creates independent stores with the api reducer mounted", () => {
  const a = createAppStore();
  const b = createAppStore();
  expect(a).not.toBe(b);
  expect(Object.keys(a.getState())).toEqual(
    expect.arrayContaining(["api", "moments", "auth", "comments", "chats", "stories"])
  );
});

it("starts logged out when there is no storage (Node)", () => {
  expect(typeof localStorage).toBe("undefined");
  expect(createAppStore().getState().auth.userInfo).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/store/createAppStore.test.ts`
Expected: FAIL — `createAppStore is not a function` (or `ReferenceError: localStorage is not defined` thrown from `authSlice.ts`).

- [ ] **Step 3: Guard the module-level storage read in `authSlice.ts`**

In `getInitialUserInfo`, change the first line:

```ts
const getInitialUserInfo = () => {
  // Module-level read: runs at import, including inside the prerenderer and
  // node-environment tests where no storage exists. Absent storage means
  // "logged out", never a crash.
  if (typeof localStorage === "undefined") return null;
  const storedRaw = localStorage.getItem("userInfo");
```

- [ ] **Step 4: Add the factory to `src/store/index.ts`**

Replace the file with:

```ts
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./slices/apiSlice";
import momentSliceReducer from "./slices/momentsSlice";
import authSliceReducer from "./slices/authSlice";
import commentsSliceReducer from "./slices/comments";
import chatApiSliceReducer from "./slices/chatSlice";
import storiesApiSliceReducer from "./slices/storiesSlice";

/**
 * One store per consumer. The browser uses the singleton below for the life
 * of the tab; the prerenderer builds a fresh store per route so prefetched
 * data from one page never leaks into another.
 */
export function createAppStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      moments: momentSliceReducer,
      auth: authSliceReducer,
      comments: commentsSliceReducer,
      chats: chatApiSliceReducer,
      stories: storiesApiSliceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    devTools: true,
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore["dispatch"];

const rootReducer = createAppStore();
export type RootState = ReturnType<typeof rootReducer.getState>;

export default rootReducer;
```

- [ ] **Step 5: Run the test, then the full suite**

Run: `CI=true npx react-scripts test --watchAll=false src/store/createAppStore.test.ts && CI=true npx react-scripts test --watchAll=false`
Expected: PASS both.

- [ ] **Step 6: Commit**

```bash
git add src/store/index.ts src/store/slices/authSlice.ts src/store/createAppStore.test.ts
git commit -m "feat(store): createAppStore factory; guard authSlice storage read for Node

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Move render-time browser reads into effects (AppBanner, StickyAppBanner, PromoCarousel)

**Files:**
- Modify: `src/components/linking/AppBanner.tsx:26-31`
- Modify: `src/components/growth/StickyAppBanner.tsx:10-18`
- Modify: `src/components/growth/PromoCarousel.tsx:13-22`
- Test: `src/components/growth/serverSafe.test.tsx` (new), existing `src/components/growth/growthSurfaces.test.tsx` and `src/components/home/HomeMain.test.tsx` must keep passing.

**Interfaces:**
- No new exports. Behavioural contract: each of these components renders `null` on the very first render (server and client alike) and reveals itself from an effect. That keeps the prerendered markup and the first client render identical (no hydration mismatch) and keeps `window`/`navigator` out of the render path.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/growth/serverSafe.test.tsx
/**
 * @jest-environment node
 */
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import StickyAppBanner from "./StickyAppBanner";
import PromoCarousel from "./PromoCarousel";
import AppBanner from "../linking/AppBanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

// These three read window/navigator. In Node none of that exists, so a read
// during render is a ReferenceError — exactly what the prerenderer must never
// see. They must render nothing on the first pass and reveal from an effect.
it("StickyAppBanner renders nothing on the server", () => {
  expect(renderToString(<StickyAppBanner />)).toBe("");
});

it("PromoCarousel renders nothing on the server", () => {
  expect(renderToString(<PromoCarousel />)).toBe("");
});

it("AppBanner renders nothing on the server", () => {
  const html = renderToString(
    <MemoryRouter initialEntries={["/moment/abc"]}><AppBanner /></MemoryRouter>
  );
  expect(html).toBe("");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/growth/serverSafe.test.tsx`
Expected: FAIL with `ReferenceError: window is not defined` (StickyAppBanner, PromoCarousel) and `navigator is not defined` (AppBanner).

- [ ] **Step 3: StickyAppBanner — start hidden, decide in an effect**

Replace lines 10-18 (`const [hidden, setHidden] = useState(() => isSuppressed(...)); const [storeUrl] = useState(storeUrlForUserAgent);`) with:

```tsx
  // Hidden until mounted: the prerenderer and the first client render must
  // agree, and the gate needs window to decide. Deciding in an effect costs
  // one frame and buys a clean hydration.
  const [hidden, setHidden] = useState(true);
  const [storeUrl, setStoreUrl] = useState("");

  useEffect(() => {
    setStoreUrl(storeUrlForUserAgent());
    setHidden(
      isSuppressed("sticky-banner", {
        pathname: window.location.pathname,
        referrer: document.referrer,
        viewportWidth: window.innerWidth,
      })
    );
  }, []);
```

Add `useEffect` to the React import on line 1 (`import React, { useCallback, useEffect, useState } from "react";`). Leave `storeUrlForUserAgent` (lines 5-8) as it is — it is now only called inside the effect.

- [ ] **Step 4: PromoCarousel — same pattern**

Replace lines 16-22 (`const [dismissed, setDismissed] = useState(() => isSuppressed("promo-carousel", {...}));`) with:

```tsx
  // Dismissed (= not rendered) until the effect below has consulted the gate;
  // see StickyAppBanner for why the decision cannot live in the initializer.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(
      isSuppressed("promo-carousel", {
        pathname: window.location.pathname,
        referrer: document.referrer,
        viewportWidth: window.innerWidth,
      })
    );
  }, []);
```

`useEffect` is already imported in this file.

- [ ] **Step 5: AppBanner — platform from an effect**

Replace the `useState`/early-return block (lines 26-31) with:

```tsx
const AppBanner: React.FC = () => {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  // "other" until mounted so the server and the first client render both
  // produce nothing; the real platform is read once the DOM exists.
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>('other');
  const { t } = useTranslation();

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);

  if (dismissed) return null;
  if (platform === 'other') return null;
```

Change line 1 to `import React, { useEffect, useState } from 'react';`.

- [ ] **Step 6: Run the new test and the existing surface tests**

Run: `CI=true npx react-scripts test --watchAll=false src/components/growth src/components/home/HomeMain.test.tsx`
Expected: PASS. `growthSurfaces.test.tsx` and `HomeMain.test.tsx` use Testing Library's `render`, which flushes effects inside `act`, so "mounts the promo carousel" and the banner assertions still see the revealed elements. If an existing assertion relied on the *first* render already showing the surface, wrap the query in `await screen.findByTestId(...)` in that test — do not weaken the component.

- [ ] **Step 7: Commit**

```bash
git add src/components/linking/AppBanner.tsx src/components/growth/StickyAppBanner.tsx src/components/growth/PromoCarousel.tsx src/components/growth/serverSafe.test.tsx
git commit -m "fix(growth,linking): decide visibility in effects so server and first client render match

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `TermsOfUse` gets its `h1`

**Files:**
- Modify: `src/components/navbar/TermsOfUse.tsx:8`
- Test: `src/components/navbar/legalPages.test.tsx` (new)

**Interfaces:** none. Every prerendered route must contain exactly one `<h1>` (Task 12 enforces it); `TermsOfUse` is the only public page without one (`PrivacyPolicy`, `DataDeletion`, `SupportMain`, `DownloadApp`, `MomentsAppPromo`, `HeroDemo` each have exactly one).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/navbar/legalPages.test.tsx
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TermsOfUse from "./TermsOfUse";
import PrivacyPolicy from "./PrivacyPolicy";
import DataDeletion from "./DataDeletion";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

// The prerenderer refuses any page without exactly one h1 (a page with no
// heading is a page a crawler cannot title). Pin it for the legal set.
it.each([
  ["TermsOfUse", TermsOfUse],
  ["PrivacyPolicy", PrivacyPolicy],
  ["DataDeletion", DataDeletion],
])("%s renders exactly one h1", (_name, Page) => {
  const { container } = render(<MemoryRouter><Page /></MemoryRouter>);
  expect(container.querySelectorAll("h1")).toHaveLength(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/navbar/legalPages.test.tsx`
Expected: FAIL for `TermsOfUse` (0 h1), PASS for the other two.

- [ ] **Step 3: Change the heading**

In `src/components/navbar/TermsOfUse.tsx` line 8, change `<h2 className="mb-3">Terms of Use</h2>` to `<h1 className="mb-3 h2">Terms of Use</h1>` (Bootstrap's `.h2` keeps the visual size).

- [ ] **Step 4: Run the test**

Run: `CI=true npx react-scripts test --watchAll=false src/components/navbar/legalPages.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/navbar/TermsOfUse.tsx src/components/navbar/legalPages.test.tsx
git commit -m "fix(terms): page heading is an h1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: The metadata table `src/seo/pages.ts`

**Files:**
- Create: `src/seo/pages.ts`
- Test: `src/seo/pages.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const SITE_ORIGIN = "https://banatalk.com";
  export const DEFAULT_OG_IMAGE = "/og-image.png";
  export interface SeoContext { url: string; values?: Record<string, string>; }
  export type SeoPage = { path: string; titleKey: string; descriptionKey: string; primary: string; secondary: string[]; jsonLd?: (ctx: SeoContext) => object | object[]; ogImage?: string; };
  export const SEO_PAGES: SeoPage[];
  export function getPage(path: string): SeoPage | undefined;   // exact match on `path`
  export function englishOf(key: string): string;               // dotted key into eng.json, "" if absent
  export function interpolate(template: string, values?: Record<string, string>): string; // "{{name}}" → values.name
  ```
- Consumed by: Task 6 (`PageMeta`), Task 12 (`publicRoutes.ts`), Task 7 (locale keys must match `titleKey`/`descriptionKey`).
- English copy lives in `eng.json` (Task 7 adds it); `englishOf` reads it so the table never duplicates strings. Until Task 7 lands, `englishOf` returns `""` and the test in this task fails on length — that is expected; this task's test is finished by Task 7. Run the *structural* assertions now, the *copy* assertions after Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// src/seo/pages.test.ts
import { SEO_PAGES, getPage, englishOf, interpolate } from "./pages";
import { routes, collectPaths } from "../router/routes";

const routePaths = collectPaths(routes);

describe("structure", () => {
  it("every entry points at a route that exists in the tree", () => {
    SEO_PAGES.forEach((p) => expect(routePaths).toContain(p.path));
  });

  it("paths are unique and slash-normalised", () => {
    const paths = SEO_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    paths.forEach((p) => expect(p).toMatch(/^\/([^/].*[^/])?$|^\/$/));
  });

  it("getPage finds by exact path only", () => {
    expect(getPage("/download")).toBeDefined();
    expect(getPage("/download/")).toBeUndefined();
    expect(getPage("/nope")).toBeUndefined();
  });

  it("interpolate fills {{placeholders}} and leaves unknown ones empty", () => {
    expect(interpolate("{{name}} speaks {{speaks}}", { name: "Mina", speaks: "Korean" }))
      .toBe("Mina speaks Korean");
    expect(interpolate("{{name}} on BananaTalk", {})).toBe(" on BananaTalk");
  });
});

// Copy rules from the spec (§9): title ≤ 60, description ≤ 160, unique
// titles, and each title carries its own primary phrase so the keyword map
// is enforced rather than aspirational.
describe("copy", () => {
  const sample = { name: "Mina Park", learning: "Spanish", speaks: "Korean" };

  it.each(SEO_PAGES.map((p) => [p.path, p]))("%s has a title and description within limits", (_path, p) => {
    const page = p as typeof SEO_PAGES[number];
    const title = interpolate(englishOf(page.titleKey), sample);
    const description = interpolate(englishOf(page.descriptionKey), sample);
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(title.toLowerCase()).toContain(page.primary.toLowerCase());
  });

  it("no two routes share a title", () => {
    const titles = SEO_PAGES.map((p) => englishOf(p.titleKey));
    expect(new Set(titles).size).toBe(titles.length);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/seo/pages.test.ts`
Expected: FAIL — `Cannot find module './pages'`.

- [ ] **Step 3: Write `src/seo/pages.ts`**

```ts
// src/seo/pages.ts
import en from "../utils/locales/eng.json";

export const SITE_ORIGIN = "https://banatalk.com";
export const DEFAULT_OG_IMAGE = "/og-image.png";

export interface SeoContext {
  url: string;
  values?: Record<string, string>;
}

/**
 * One entry per indexed route. `primary`/`secondary` are the keyword map:
 * documentation for whoever writes copy, and asserted against the English
 * title by pages.test.ts. They are never rendered.
 */
export type SeoPage = {
  path: string;                 // "/download" — exact, no trailing slash
  titleKey: string;             // i18n key; English lives in eng.json
  descriptionKey: string;
  primary: string;              // the phrase the title and h1 target
  secondary: string[];          // supporting phrases used in body copy
  jsonLd?: (ctx: SeoContext) => object | object[];
  ogImage?: string;             // defaults to DEFAULT_OG_IMAGE
};

export const SEO_PAGES: SeoPage[] = [
  {
    path: "/",
    titleKey: "seo.home.title",
    descriptionKey: "seo.home.description",
    primary: "language exchange app",
    secondary: ["practice speaking with native speakers", "free language exchange", "learn a language by chatting"],
  },
  {
    path: "/download",
    titleKey: "seo.download.title",
    descriptionKey: "seo.download.description",
    primary: "download BananaTalk",
    secondary: ["language exchange app for iPhone", "language exchange app for Android"],
  },
  {
    path: "/moments",
    titleKey: "seo.moments.title",
    descriptionKey: "seo.moments.description",
    primary: "Moments on BananaTalk",
    secondary: ["language learning posts", "share your language journey"],
  },
  {
    path: "/privacy-policy",
    titleKey: "seo.privacy.title",
    descriptionKey: "seo.privacy.description",
    primary: "privacy policy",
    secondary: [],
  },
  {
    path: "/terms-of-use",
    titleKey: "seo.terms.title",
    descriptionKey: "seo.terms.description",
    primary: "terms of use",
    secondary: [],
  },
  {
    path: "/support",
    titleKey: "seo.support.title",
    descriptionKey: "seo.support.description",
    primary: "support",
    secondary: ["help", "contact"],
  },
  {
    path: "/data-deletion",
    titleKey: "seo.dataDeletion.title",
    descriptionKey: "seo.dataDeletion.description",
    primary: "data deletion",
    secondary: ["delete my account"],
  },
  {
    // Dynamic: PageMeta is rendered by CommunityDetail once the profile has
    // loaded, with values { name, learning, speaks }. Not prerendered.
    path: "/profile/:userId",
    titleKey: "seo.profile.title",
    descriptionKey: "seo.profile.description",
    primary: "on BananaTalk",
    secondary: ["language partner", "native speaker"],
  },
];

export function getPage(path: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.path === path);
}

/** English copy for a dotted i18n key, straight from eng.json; "" if absent. */
export function englishOf(key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    return node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
  }, en as unknown);
  return typeof value === "string" ? value : "";
}

/** i18next-style "{{name}}" placeholders for the English fallback path. */
export function interpolate(template: string, values?: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => (values && values[key]) || "");
}
```

- [ ] **Step 4: Run the test**

Run: `CI=true npx react-scripts test --watchAll=false src/seo/pages.test.ts`
Expected: the `structure` block PASSES; the `copy` block FAILS with `Expected length > 0` because the `seo.*` keys are not in `eng.json` yet. That is the planned state; Task 7 turns it green. Do not add strings to `pages.ts` to force it.

- [ ] **Step 5: Commit**

```bash
git add src/seo/pages.ts src/seo/pages.test.ts
git commit -m "feat(seo): metadata table and keyword map for indexed routes

Copy assertions stay red until the seo locale namespace lands (next tasks).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `PageMeta`, `HelmetProvider`, and the site-wide noindex default

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/seo/PageMeta.tsx`
- Modify: `src/index.tsx`
- Modify: `src/App.tsx`
- Test: `src/seo/PageMeta.test.tsx`

**Interfaces:**
- Produces: `export interface PageMetaProps { route?: string; values?: Record<string, string>; noindex?: boolean; title?: string; }` and `export default PageMeta`. `<PageMeta route="/download" />` renders the indexed set; `<PageMeta noindex title="Login" />` (or any call without a matching `route`) renders `<title>` + `robots: noindex, nofollow`.
- Precedence: `App` renders `<PageMeta noindex />` for every route. react-helmet-async registers instances in *render* order, so a page's own `<PageMeta route=…>` (rendered later, deeper) overrides the default tag-by-tag (`title`, and `meta[name=robots]` deduped by `name`). This is how "every other route is noindex" is met without touching 40 files.
- Consumers must render inside a router context (`useLocation`) and a `HelmetProvider`.

- [ ] **Step 1: Install react-helmet-async 1.3.0**

Run: `npm install --save --save-exact react-helmet-async@1.3.0`
Expected: `package.json` gains `"react-helmet-async": "1.3.0"`; `node -p "require('react-helmet-async/package.json').version"` prints `1.3.0`. (1.x is the line known to type-check under TS 3.7.2; 2.x is not.)

- [ ] **Step 2: Write the failing test**

```tsx
// src/seo/PageMeta.test.tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider, FilledContext } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import PageMeta from "./PageMeta";

// Echo keys so the assertions read the *key* that was asked for, and prove
// the fallback path by returning "" for one of them.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "seo.download.description" ? "" : key),
  }),
}));

jest.mock("./pages", () => {
  const actual = jest.requireActual("./pages");
  return {
    ...actual,
    // Deterministic English regardless of eng.json state.
    englishOf: (key: string) =>
      key === "seo.download.description" ? "English fallback description" : "",
  };
});

// Server-side extraction is the deterministic way to read helmet output;
// in jsdom it applies asynchronously via requestAnimationFrame.
function headFor(ui: React.ReactElement, path = "/download") {
  const ctx = {} as FilledContext;
  renderToString(
    <HelmetProvider context={ctx}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>
  );
  const { helmet } = ctx;
  return [helmet.title.toString(), helmet.meta.toString(), helmet.link.toString(), helmet.script.toString()].join("\n");
}

it("renders the indexed set for a known route", () => {
  const head = headFor(<PageMeta route="/download" />);
  expect(head).toContain("<title data-rh=\"true\">seo.download.title</title>");
  expect(head).toContain('name="description" content="English fallback description"');
  expect(head).toContain('rel="canonical" href="https://banatalk.com/download"');
  expect(head).toContain('name="robots" content="index, follow');
  expect(head).toContain('property="og:url" content="https://banatalk.com/download"');
  expect(head).toContain('property="og:image" content="https://banatalk.com/og-image.png"');
  expect(head).toContain('name="twitter:card" content="summary_large_image"');
});

it("uses the real pathname as canonical for a dynamic route", () => {
  const head = headFor(
    <PageMeta route="/profile/:userId" values={{ name: "Mina", learning: "Spanish", speaks: "Korean" }} />,
    "/profile/abc123"
  );
  expect(head).toContain('rel="canonical" href="https://banatalk.com/profile/abc123"');
});

it("renders the noindex form when asked, or when the route is unknown", () => {
  expect(headFor(<PageMeta noindex title="Login" />)).toContain('name="robots" content="noindex, nofollow"');
  expect(headFor(<PageMeta noindex title="Login" />)).toContain("<title data-rh=\"true\">Login</title>");
  expect(headFor(<PageMeta route="/does-not-exist" />)).toContain("noindex, nofollow");
  expect(headFor(<PageMeta noindex />)).toContain("<title data-rh=\"true\">BananaTalk</title>");
});

it("a page's PageMeta overrides the layout's noindex default", () => {
  const head = headFor(
    <>
      <PageMeta noindex />
      <div><PageMeta route="/download" /></div>
    </>
  );
  expect(head).toContain("index, follow");
  expect(head).not.toContain("noindex");
  expect(head).toContain("seo.download.title");
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/seo/PageMeta.test.tsx`
Expected: FAIL — `Cannot find module './PageMeta'`.

- [ ] **Step 4: Write `src/seo/PageMeta.tsx`**

```tsx
// src/seo/PageMeta.tsx
import React from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { DEFAULT_OG_IMAGE, SITE_ORIGIN, englishOf, getPage, interpolate } from "./pages";

export interface PageMetaProps {
  /** Exact `path` of an entry in SEO_PAGES. Omit for app-only routes. */
  route?: string;
  /** Interpolation values for dynamic routes ({{name}} …). */
  values?: Record<string, string>;
  /** Force the noindex form even if `route` matches. */
  noindex?: boolean;
  /** Title for the noindex form; defaults to the brand. */
  title?: string;
}

const BRAND = "BananaTalk";
const INDEX_ROBOTS = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

/**
 * The only place <head> tags are written. `App` renders `<PageMeta noindex />`
 * for every route; indexed pages render their own entry deeper in the tree,
 * which react-helmet-async lets win because it registers Helmet instances in
 * render order.
 */
const PageMeta: React.FC<PageMetaProps> = ({ route, values, noindex, title }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const page = route ? getPage(route) : undefined;

  if (!page || noindex) {
    return (
      <Helmet>
        <title>{title || BRAND}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    );
  }

  const resolvedTitle =
    t(page.titleKey, values) || interpolate(englishOf(page.titleKey), values);
  const description =
    t(page.descriptionKey, values) || interpolate(englishOf(page.descriptionKey), values);
  const isDynamic = page.path.indexOf(":") >= 0;
  const canonicalPath = isDynamic ? pathname.replace(/\/+$/, "") || "/" : page.path;
  const url = SITE_ORIGIN + canonicalPath;
  const image = SITE_ORIGIN + (page.ogImage || DEFAULT_OG_IMAGE);
  const ld = page.jsonLd ? page.jsonLd({ url, values }) : undefined;
  const blocks: object[] = ld === undefined ? [] : Array.isArray(ld) ? ld : [ld];

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={INDEX_ROBOTS} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(block)}</script>
      ))}
    </Helmet>
  );
};

export default PageMeta;
```

- [ ] **Step 5: Run the test**

Run: `CI=true npx react-scripts test --watchAll=false src/seo/PageMeta.test.tsx`
Expected: PASS. If the `t(page.titleKey, values)` call fails type-checking later in `react-scripts build` (react-i18next 13's `t` overloads under TS 3.7), change it to `t(page.titleKey, values as Record<string, unknown>)`.

- [ ] **Step 6: Wrap the app in `HelmetProvider` (`src/index.tsx`)**

Add `import { HelmetProvider } from "react-helmet-async";` and wrap the tree:

```tsx
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={rootReducer}>
        <RouterProvider router={router} />
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);
```

(Task 14 rewrites the render call for hydration; keep this shape so the diff there is small.)

- [ ] **Step 7: Render the default in `src/App.tsx`**

Add `import PageMeta from "./seo/PageMeta";` and make `<PageMeta noindex />` the first child inside `<SocketProvider>`:

```tsx
      <SocketProvider>
        <PageMeta noindex />
        <MainNavbar />
```

- [ ] **Step 8: Run the whole suite**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS. Any existing test that renders `App` or a page now needing `HelmetProvider` will throw `Cannot read properties of undefined (reading 'add')` from react-helmet-async — wrap that test's tree in `<HelmetProvider>`; no such test exists today, but check.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/seo/PageMeta.tsx src/seo/PageMeta.test.tsx src/index.tsx src/App.tsx
git commit -m "feat(seo): PageMeta over react-helmet-async; every route noindex by default

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Wire `PageMeta` into the public pages; add every Phase A locale key

**Files:**
- Create: `scripts/merge-locales.js`, `scripts/locales/phase-a.json`
- Modify: `src/utils/locales/{eng,kor,zho,zh_TW,ja,es,fr,de,pt,it,ru,ar,hi,id,th,tl,tr,vi}.json` (via the script)
- Modify: `src/components/home/HomeMain.tsx`, `src/components/download/DownloadApp.tsx`, `src/components/moments/MomentsAppPromo.tsx`, `src/components/navbar/PrivacyPolicy.tsx`, `src/components/navbar/TermsOfUse.tsx`, `src/components/support/SupportMain.tsx`, `src/components/navbar/DataDeletion.tsx`, `src/components/community/CommunityDetail.tsx`
- Test: `src/utils/localeParity.test.ts` (new); `src/seo/pages.test.ts` (Task 5, turns fully green here); `src/seo/publicPagesMeta.test.tsx` (new)

**Interfaces:**
- Locale keys added (all 18 files): `seo.{home,download,moments,privacy,terms,support,dataDeletion,profile}.{title,description}`, `notFound.{title,heading,message,home,download}`, `consent.{message,accept,decline}`, `footer.links.{communities,support,download}`, `home.stats.learners`. Later tasks (8, 11, 15, 18) consume these keys and add no others.
- `scripts/merge-locales.js <additions.json>` deep-merges `{ "<code>": {...} }` into `src/utils/locales/<code>.json`, preserving each file's indentation (they use 4 spaces).

- [ ] **Step 1: Write the parity test**

```ts
// src/utils/localeParity.test.ts
// Every locale carries the same key set as English under each namespace this
// phase introduced. A missing key falls back to English silently at runtime,
// which is exactly why it must fail loudly here.
const CODES = ["ar", "de", "eng", "es", "fr", "hi", "id", "it", "ja", "kor", "pt", "ru", "th", "tl", "tr", "vi", "zh_TW", "zho"];
const NAMESPACES = ["seo", "notFound", "consent"];
const SINGLE_KEYS = ["footer.links.communities", "footer.links.support", "footer.links.download", "home.stats.learners"];

type Json = Record<string, unknown>;
const load = (code: string): Json => require(`./locales/${code}.json`);
const en = load("eng");

function keysOf(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [prefix];
  return Object.keys(node as Json).sort().flatMap((k) =>
    keysOf((node as Json)[k], prefix ? `${prefix}.${k}` : k)
  );
}
const dig = (node: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((n, p) => (n && typeof n === "object" ? (n as Json)[p] : undefined), node);

it("English defines every namespace and key this phase relies on", () => {
  NAMESPACES.forEach((ns) => expect(typeof en[ns]).toBe("object"));
  SINGLE_KEYS.forEach((k) => expect(typeof dig(en, k)).toBe("string"));
});

describe.each(CODES.filter((c) => c !== "eng"))("%s", (code) => {
  const locale = load(code);
  it.each(NAMESPACES)("matches the English key set under %s", (ns) => {
    expect(keysOf(locale[ns])).toEqual(keysOf(en[ns]));
  });
  it.each(SINGLE_KEYS)("carries %s", (k) => {
    const v = dig(locale, k);
    expect(typeof v).toBe("string");
    expect((v as string).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/localeParity.test.ts`
Expected: FAIL — `expected "object", received "undefined"` for `seo`.

- [ ] **Step 3: Write `scripts/merge-locales.js`**

```js
#!/usr/bin/env node
/**
 * Deep-merge a { "<localeCode>": { ...nested keys } } JSON file into
 * src/utils/locales/<localeCode>.json, keeping each file's own indentation.
 *
 *   node scripts/merge-locales.js scripts/locales/phase-a.json
 *
 * Existing keys are overwritten only when the additions file names them;
 * everything else is untouched, so the git diff is just the new keys.
 */
const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/merge-locales.js <additions.json>");
  process.exit(1);
}

const additions = JSON.parse(fs.readFileSync(file, "utf8"));
const dir = path.resolve(__dirname, "../src/utils/locales");

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const merge = (target, src) => {
  for (const key of Object.keys(src)) {
    if (isObject(src[key])) {
      target[key] = merge(isObject(target[key]) ? target[key] : {}, src[key]);
    } else {
      target[key] = src[key];
    }
  }
  return target;
};

for (const code of Object.keys(additions)) {
  const target = path.join(dir, `${code}.json`);
  const raw = fs.readFileSync(target, "utf8");
  const indentMatch = /^\{\r?\n([ \t]+)"/.exec(raw);
  const indent = indentMatch ? indentMatch[1] : "    ";
  const merged = merge(JSON.parse(raw), additions[code]);
  fs.writeFileSync(target, JSON.stringify(merged, null, indent) + "\n");
  console.log(`merged ${Object.keys(additions[code]).join(", ")} into ${code}.json`);
}
```

- [ ] **Step 4: Write `scripts/locales/phase-a.json`**

```json
{
  "eng": {
    "seo": {
      "home": { "title": "BananaTalk: Free Language Exchange App with Native Speakers", "description": "Practice speaking with native speakers in 137 languages. Write in yours, they read it in theirs, and you learn from the difference. Free on iOS and Android." },
      "download": { "title": "Download BananaTalk for iPhone and Android", "description": "Get the BananaTalk language exchange app on the App Store or Google Play. Chat with native speakers, get instant translation and an AI tutor. Free to install." },
      "moments": { "title": "Moments on BananaTalk: Share Your Language Journey", "description": "Moments are short posts from language learners around the world. See what people are learning, cheer them on, and share your own from the BananaTalk app." },
      "privacy": { "title": "Privacy Policy | BananaTalk", "description": "How BananaTalk collects, uses and protects your data, and the choices you have." },
      "terms": { "title": "Terms of Use | BananaTalk", "description": "The rules for using BananaTalk: your account, acceptable conduct, content, subscriptions and how to reach us." },
      "support": { "title": "Support and Help | BananaTalk", "description": "Get help with your BananaTalk account, report a problem or contact the team." },
      "dataDeletion": { "title": "Data Deletion Request | BananaTalk", "description": "How to delete your BananaTalk account and personal data, and what happens when you do." },
      "profile": { "title": "{{name}} – learning {{learning}}, speaks {{speaks}} on BananaTalk", "description": "{{name}} is on BananaTalk learning {{learning}} and speaking {{speaks}}. Say hello and practice together in the app." }
    },
    "notFound": { "title": "Page not found | BananaTalk", "heading": "This page doesn't exist", "message": "The link may be old or mistyped. The app, on the other hand, is right here.", "home": "Go to the homepage", "download": "Download the app" },
    "consent": { "message": "We use analytics cookies to understand what brings people here.", "accept": "OK", "decline": "No thanks" },
    "footer": { "links": { "communities": "Communities", "support": "Support", "download": "Download the app" } },
    "home": { "stats": { "learners": "learners" } }
  },
  "kor": {
    "seo": {
      "home": { "title": "바나나톡: 원어민과 함께하는 무료 언어교환 앱", "description": "137개 언어의 원어민과 말하기 연습을 하세요. 내 언어로 쓰면 상대는 자기 언어로 읽고, 그 차이에서 배웁니다. iOS와 Android에서 무료." },
      "download": { "title": "아이폰·안드로이드용 바나나톡 다운로드", "description": "App Store와 Google Play에서 바나나톡 언어교환 앱을 받으세요. 원어민과 채팅, 즉시 번역, AI 튜터까지. 설치는 무료입니다." },
      "moments": { "title": "바나나톡 모먼트: 나의 언어 여정을 공유하세요", "description": "모먼트는 전 세계 언어 학습자들의 짧은 게시물입니다. 사람들이 무엇을 배우는지 보고 응원하며, 바나나톡 앱에서 내 모먼트를 올려보세요." },
      "privacy": { "title": "개인정보 처리방침 | 바나나톡", "description": "바나나톡이 데이터를 수집·이용·보호하는 방식과 여러분이 선택할 수 있는 사항." },
      "terms": { "title": "이용약관 | 바나나톡", "description": "바나나톡 이용 규칙: 계정, 이용 행동, 콘텐츠, 구독, 문의 방법." },
      "support": { "title": "지원 및 도움말 | 바나나톡", "description": "바나나톡 계정 관련 도움을 받거나 문제를 신고하고 팀에 문의하세요." },
      "dataDeletion": { "title": "데이터 삭제 요청 | 바나나톡", "description": "바나나톡 계정과 개인 데이터를 삭제하는 방법과 삭제 후 처리 과정." },
      "profile": { "title": "{{name}} – {{learning}} 배우는 중, {{speaks}} 구사 · 바나나톡", "description": "{{name}}님은 바나나톡에서 {{learning}}을(를) 배우고 {{speaks}}을(를) 구사합니다. 앱에서 인사하고 함께 연습해 보세요." }
    },
    "notFound": { "title": "페이지를 찾을 수 없음 | 바나나톡", "heading": "존재하지 않는 페이지입니다", "message": "링크가 오래되었거나 잘못 입력되었을 수 있어요. 대신 앱은 바로 여기 있습니다.", "home": "홈으로 가기", "download": "앱 다운로드" },
    "consent": { "message": "무엇이 사람들을 여기로 이끄는지 알기 위해 분석 쿠키를 사용합니다.", "accept": "확인", "decline": "괜찮아요" },
    "footer": { "links": { "communities": "커뮤니티", "support": "지원", "download": "앱 다운로드" } },
    "home": { "stats": { "learners": "학습자" } }
  },
  "zho": {
    "seo": {
      "home": { "title": "BananaTalk：与母语者交流的免费语言交换应用", "description": "与137种语言的母语者练习口语。你用自己的语言写，对方用他们的语言读，在差异中学习。iOS 和 Android 免费使用。" },
      "download": { "title": "下载 BananaTalk（iPhone 与 Android）", "description": "在 App Store 或 Google Play 获取 BananaTalk 语言交换应用。与母语者聊天、即时翻译、AI 导师。免费安装。" },
      "moments": { "title": "BananaTalk 动态：分享你的语言学习之旅", "description": "动态是来自世界各地语言学习者的短帖子。看看大家在学什么，为他们加油，并在 BananaTalk 应用中分享你的动态。" },
      "privacy": { "title": "隐私政策 | BananaTalk", "description": "BananaTalk 如何收集、使用和保护你的数据，以及你可以做出的选择。" },
      "terms": { "title": "使用条款 | BananaTalk", "description": "使用 BananaTalk 的规则：账户、行为规范、内容、订阅以及联系方式。" },
      "support": { "title": "支持与帮助 | BananaTalk", "description": "获取 BananaTalk 账户帮助、报告问题或联系团队。" },
      "dataDeletion": { "title": "数据删除请求 | BananaTalk", "description": "如何删除你的 BananaTalk 账户和个人数据，以及删除后会发生什么。" },
      "profile": { "title": "{{name}} – 正在学 {{learning}}，会说 {{speaks}} · BananaTalk", "description": "{{name}} 正在 BananaTalk 上学习 {{learning}}，会说 {{speaks}}。在应用中打个招呼，一起练习吧。" }
    },
    "notFound": { "title": "页面不存在 | BananaTalk", "heading": "这个页面不存在", "message": "链接可能已过期或输入有误。不过，应用就在这里。", "home": "返回首页", "download": "下载应用" },
    "consent": { "message": "我们使用分析 Cookie 来了解人们是如何来到这里的。", "accept": "好的", "decline": "不用了" },
    "footer": { "links": { "communities": "社区", "support": "支持", "download": "下载应用" } },
    "home": { "stats": { "learners": "学习者" } }
  },
  "zh_TW": {
    "seo": {
      "home": { "title": "BananaTalk：與母語者交流的免費語言交換 App", "description": "與 137 種語言的母語者練習口說。你用自己的語言寫，對方用他們的語言讀，在差異中學習。iOS 與 Android 免費使用。" },
      "download": { "title": "下載 BananaTalk（iPhone 與 Android）", "description": "在 App Store 或 Google Play 取得 BananaTalk 語言交換 App。與母語者聊天、即時翻譯、AI 導師。免費安裝。" },
      "moments": { "title": "BananaTalk 動態：分享你的語言學習旅程", "description": "動態是來自世界各地語言學習者的短貼文。看看大家在學什麼，為他們加油，並在 BananaTalk App 中分享你的動態。" },
      "privacy": { "title": "隱私權政策 | BananaTalk", "description": "BananaTalk 如何收集、使用與保護你的資料，以及你可以做的選擇。" },
      "terms": { "title": "使用條款 | BananaTalk", "description": "使用 BananaTalk 的規則：帳號、行為規範、內容、訂閱以及聯絡方式。" },
      "support": { "title": "支援與協助 | BananaTalk", "description": "取得 BananaTalk 帳號協助、回報問題或聯絡團隊。" },
      "dataDeletion": { "title": "資料刪除申請 | BananaTalk", "description": "如何刪除你的 BananaTalk 帳號與個人資料，以及刪除後會發生什麼。" },
      "profile": { "title": "{{name}} – 正在學 {{learning}}，會說 {{speaks}} · BananaTalk", "description": "{{name}} 正在 BananaTalk 上學習 {{learning}}，會說 {{speaks}}。在 App 中打個招呼，一起練習吧。" }
    },
    "notFound": { "title": "找不到頁面 | BananaTalk", "heading": "這個頁面不存在", "message": "連結可能已過期或輸入有誤。不過，App 就在這裡。", "home": "回到首頁", "download": "下載 App" },
    "consent": { "message": "我們使用分析 Cookie 來了解大家是如何來到這裡的。", "accept": "好", "decline": "不用了" },
    "footer": { "links": { "communities": "社群", "support": "支援", "download": "下載 App" } },
    "home": { "stats": { "learners": "學習者" } }
  },
  "ja": {
    "seo": {
      "home": { "title": "BananaTalk：ネイティブと話せる無料の言語交換アプリ", "description": "137言語のネイティブスピーカーと会話練習。自分の言語で書けば相手は自分の言語で読み、その違いから学べます。iOS・Androidで無料。" },
      "download": { "title": "BananaTalkをダウンロード（iPhone・Android）", "description": "App StoreまたはGoogle PlayでBananaTalk言語交換アプリを入手。ネイティブとチャット、即時翻訳、AIチューター。インストール無料。" },
      "moments": { "title": "BananaTalkのモーメント：語学の旅をシェア", "description": "モーメントは世界中の語学学習者による短い投稿です。みんなが何を学んでいるかを見て応援し、BananaTalkアプリから自分の投稿もシェアしましょう。" },
      "privacy": { "title": "プライバシーポリシー | BananaTalk", "description": "BananaTalkがデータをどのように収集・利用・保護するか、そしてあなたが選べること。" },
      "terms": { "title": "利用規約 | BananaTalk", "description": "BananaTalkの利用ルール：アカウント、行動規範、コンテンツ、サブスクリプション、お問い合わせ方法。" },
      "support": { "title": "サポートとヘルプ | BananaTalk", "description": "BananaTalkアカウントのサポート、問題の報告、チームへの連絡はこちら。" },
      "dataDeletion": { "title": "データ削除リクエスト | BananaTalk", "description": "BananaTalkアカウントと個人データの削除方法と、削除後に起こること。" },
      "profile": { "title": "{{name}} – {{learning}}を学習中、{{speaks}}を話す · BananaTalk", "description": "{{name}}さんはBananaTalkで{{learning}}を学び、{{speaks}}を話します。アプリで挨拶して一緒に練習しましょう。" }
    },
    "notFound": { "title": "ページが見つかりません | BananaTalk", "heading": "このページは存在しません", "message": "リンクが古いか、入力ミスかもしれません。アプリはこちらにあります。", "home": "ホームへ", "download": "アプリをダウンロード" },
    "consent": { "message": "みなさんがどこから来られたのかを知るために、分析Cookieを使用しています。", "accept": "OK", "decline": "いいえ" },
    "footer": { "links": { "communities": "コミュニティ", "support": "サポート", "download": "アプリをダウンロード" } },
    "home": { "stats": { "learners": "学習者" } }
  },
  "es": {
    "seo": {
      "home": { "title": "BananaTalk: app gratis de intercambio de idiomas con nativos", "description": "Practica con hablantes nativos en 137 idiomas. Escribe en el tuyo, ellos leen en el suyo y aprendes de la diferencia. Gratis en iOS y Android." },
      "download": { "title": "Descarga BananaTalk para iPhone y Android", "description": "Consigue la app de intercambio de idiomas BananaTalk en App Store o Google Play. Chatea con nativos, traducción instantánea y tutor de IA. Instalación gratis." },
      "moments": { "title": "Momentos en BananaTalk: comparte tu viaje con los idiomas", "description": "Los Momentos son publicaciones breves de estudiantes de idiomas de todo el mundo. Mira qué aprenden, anímalos y comparte los tuyos desde la app de BananaTalk." },
      "privacy": { "title": "Política de privacidad | BananaTalk", "description": "Cómo BananaTalk recoge, usa y protege tus datos, y qué opciones tienes." },
      "terms": { "title": "Condiciones de uso | BananaTalk", "description": "Las reglas para usar BananaTalk: tu cuenta, conducta aceptable, contenido, suscripciones y cómo contactarnos." },
      "support": { "title": "Soporte y ayuda | BananaTalk", "description": "Recibe ayuda con tu cuenta de BananaTalk, informa de un problema o contacta con el equipo." },
      "dataDeletion": { "title": "Solicitud de eliminación de datos | BananaTalk", "description": "Cómo eliminar tu cuenta de BananaTalk y tus datos personales, y qué ocurre al hacerlo." },
      "profile": { "title": "{{name}} – aprende {{learning}}, habla {{speaks}} en BananaTalk", "description": "{{name}} está en BananaTalk aprendiendo {{learning}} y habla {{speaks}}. Saluda y practicad juntos en la app." }
    },
    "notFound": { "title": "Página no encontrada | BananaTalk", "heading": "Esta página no existe", "message": "Puede que el enlace sea antiguo o esté mal escrito. La app, en cambio, está aquí mismo.", "home": "Ir a la página de inicio", "download": "Descargar la app" },
    "consent": { "message": "Usamos cookies de análisis para entender qué trae a la gente hasta aquí.", "accept": "Vale", "decline": "No, gracias" },
    "footer": { "links": { "communities": "Comunidades", "support": "Soporte", "download": "Descargar la app" } },
    "home": { "stats": { "learners": "estudiantes" } }
  },
  "fr": {
    "seo": {
      "home": { "title": "BananaTalk : appli gratuite d'échange linguistique avec des natifs", "description": "Pratiquez avec des locuteurs natifs dans 137 langues. Écrivez dans la vôtre, ils lisent dans la leur, et vous apprenez de la différence. Gratuit sur iOS et Android." },
      "download": { "title": "Télécharger BananaTalk pour iPhone et Android", "description": "Obtenez l'appli d'échange linguistique BananaTalk sur l'App Store ou Google Play. Discutez avec des natifs, traduction instantanée et tuteur IA. Installation gratuite." },
      "moments": { "title": "Moments sur BananaTalk : partagez votre parcours linguistique", "description": "Les Moments sont de courtes publications d'apprenants du monde entier. Voyez ce qu'ils apprennent, encouragez-les et partagez les vôtres depuis l'appli BananaTalk." },
      "privacy": { "title": "Politique de confidentialité | BananaTalk", "description": "Comment BananaTalk collecte, utilise et protège vos données, et les choix dont vous disposez." },
      "terms": { "title": "Conditions d'utilisation | BananaTalk", "description": "Les règles d'utilisation de BananaTalk : compte, conduite acceptable, contenu, abonnements et contact." },
      "support": { "title": "Assistance et aide | BananaTalk", "description": "Obtenez de l'aide pour votre compte BananaTalk, signalez un problème ou contactez l'équipe." },
      "dataDeletion": { "title": "Demande de suppression des données | BananaTalk", "description": "Comment supprimer votre compte BananaTalk et vos données personnelles, et ce qui se passe ensuite." },
      "profile": { "title": "{{name}} – apprend {{learning}}, parle {{speaks}} sur BananaTalk", "description": "{{name}} apprend {{learning}} sur BananaTalk et parle {{speaks}}. Dites bonjour et pratiquez ensemble dans l'appli." }
    },
    "notFound": { "title": "Page introuvable | BananaTalk", "heading": "Cette page n'existe pas", "message": "Le lien est peut-être ancien ou mal saisi. L'appli, elle, est juste ici.", "home": "Aller à l'accueil", "download": "Télécharger l'appli" },
    "consent": { "message": "Nous utilisons des cookies d'analyse pour comprendre ce qui amène les gens ici.", "accept": "OK", "decline": "Non merci" },
    "footer": { "links": { "communities": "Communautés", "support": "Assistance", "download": "Télécharger l'appli" } },
    "home": { "stats": { "learners": "apprenants" } }
  },
  "de": {
    "seo": {
      "home": { "title": "BananaTalk: Kostenlose Sprachaustausch-App mit Muttersprachlern", "description": "Übe mit Muttersprachlern in 137 Sprachen. Du schreibst in deiner Sprache, sie lesen in ihrer, und du lernst aus dem Unterschied. Kostenlos für iOS und Android." },
      "download": { "title": "BananaTalk für iPhone und Android herunterladen", "description": "Hol dir die Sprachaustausch-App BananaTalk im App Store oder bei Google Play. Chatte mit Muttersprachlern, Sofortübersetzung und KI-Tutor. Kostenlos installieren." },
      "moments": { "title": "Moments auf BananaTalk: Teile deine Sprachreise", "description": "Moments sind kurze Beiträge von Sprachlernenden aus aller Welt. Sieh, was andere lernen, feuere sie an und teile deine eigenen aus der BananaTalk-App." },
      "privacy": { "title": "Datenschutzerklärung | BananaTalk", "description": "Wie BananaTalk deine Daten erhebt, nutzt und schützt – und welche Wahl du hast." },
      "terms": { "title": "Nutzungsbedingungen | BananaTalk", "description": "Die Regeln für BananaTalk: Konto, akzeptables Verhalten, Inhalte, Abonnements und Kontakt." },
      "support": { "title": "Support und Hilfe | BananaTalk", "description": "Hilfe zu deinem BananaTalk-Konto, ein Problem melden oder das Team kontaktieren." },
      "dataDeletion": { "title": "Antrag auf Datenlöschung | BananaTalk", "description": "Wie du dein BananaTalk-Konto und deine persönlichen Daten löschst – und was dann passiert." },
      "profile": { "title": "{{name}} – lernt {{learning}}, spricht {{speaks}} auf BananaTalk", "description": "{{name}} lernt auf BananaTalk {{learning}} und spricht {{speaks}}. Sag hallo und übt gemeinsam in der App." }
    },
    "notFound": { "title": "Seite nicht gefunden | BananaTalk", "heading": "Diese Seite gibt es nicht", "message": "Der Link ist vielleicht alt oder vertippt. Die App dagegen ist genau hier.", "home": "Zur Startseite", "download": "App herunterladen" },
    "consent": { "message": "Wir nutzen Analyse-Cookies, um zu verstehen, was Menschen hierher führt.", "accept": "OK", "decline": "Nein, danke" },
    "footer": { "links": { "communities": "Communities", "support": "Support", "download": "App herunterladen" } },
    "home": { "stats": { "learners": "Lernende" } }
  },
  "pt": {
    "seo": {
      "home": { "title": "BananaTalk: app grátis de intercâmbio de idiomas com nativos", "description": "Pratique com falantes nativos em 137 idiomas. Escreva no seu, eles leem no deles e você aprende com a diferença. Grátis no iOS e Android." },
      "download": { "title": "Baixe o BananaTalk para iPhone e Android", "description": "Baixe o app de intercâmbio de idiomas BananaTalk na App Store ou no Google Play. Converse com nativos, tradução instantânea e tutor de IA. Instalação grátis." },
      "moments": { "title": "Momentos no BananaTalk: compartilhe sua jornada nos idiomas", "description": "Momentos são posts curtos de estudantes de idiomas do mundo todo. Veja o que estão aprendendo, incentive-os e compartilhe os seus pelo app BananaTalk." },
      "privacy": { "title": "Política de Privacidade | BananaTalk", "description": "Como o BananaTalk coleta, usa e protege seus dados, e quais escolhas você tem." },
      "terms": { "title": "Termos de Uso | BananaTalk", "description": "As regras para usar o BananaTalk: sua conta, conduta aceitável, conteúdo, assinaturas e como falar conosco." },
      "support": { "title": "Suporte e Ajuda | BananaTalk", "description": "Receba ajuda com sua conta BananaTalk, relate um problema ou fale com a equipe." },
      "dataDeletion": { "title": "Solicitação de exclusão de dados | BananaTalk", "description": "Como excluir sua conta BananaTalk e seus dados pessoais, e o que acontece depois." },
      "profile": { "title": "{{name}} – aprende {{learning}}, fala {{speaks}} no BananaTalk", "description": "{{name}} está no BananaTalk aprendendo {{learning}} e fala {{speaks}}. Diga oi e pratiquem juntos no app." }
    },
    "notFound": { "title": "Página não encontrada | BananaTalk", "heading": "Esta página não existe", "message": "O link pode estar antigo ou digitado errado. O app, por outro lado, está bem aqui.", "home": "Ir para a página inicial", "download": "Baixar o app" },
    "consent": { "message": "Usamos cookies de análise para entender o que traz as pessoas até aqui.", "accept": "OK", "decline": "Não, obrigado" },
    "footer": { "links": { "communities": "Comunidades", "support": "Suporte", "download": "Baixar o app" } },
    "home": { "stats": { "learners": "estudantes" } }
  },
  "it": {
    "seo": {
      "home": { "title": "BananaTalk: app gratuita di scambio linguistico con madrelingua", "description": "Fai pratica con madrelingua in 137 lingue. Scrivi nella tua, loro leggono nella loro e tu impari dalla differenza. Gratis su iOS e Android." },
      "download": { "title": "Scarica BananaTalk per iPhone e Android", "description": "Scarica l'app di scambio linguistico BananaTalk dall'App Store o da Google Play. Chatta con madrelingua, traduzione istantanea e tutor IA. Installazione gratuita." },
      "moments": { "title": "Moments su BananaTalk: condividi il tuo percorso linguistico", "description": "I Moments sono brevi post di chi studia lingue in tutto il mondo. Scopri cosa imparano, incoraggiali e condividi i tuoi dall'app BananaTalk." },
      "privacy": { "title": "Informativa sulla privacy | BananaTalk", "description": "Come BananaTalk raccoglie, usa e protegge i tuoi dati, e le scelte a tua disposizione." },
      "terms": { "title": "Termini di utilizzo | BananaTalk", "description": "Le regole per usare BananaTalk: account, condotta accettabile, contenuti, abbonamenti e come contattarci." },
      "support": { "title": "Supporto e aiuto | BananaTalk", "description": "Ricevi aiuto per il tuo account BananaTalk, segnala un problema o contatta il team." },
      "dataDeletion": { "title": "Richiesta di cancellazione dati | BananaTalk", "description": "Come eliminare il tuo account BananaTalk e i tuoi dati personali, e cosa succede dopo." },
      "profile": { "title": "{{name}} – impara {{learning}}, parla {{speaks}} su BananaTalk", "description": "{{name}} è su BananaTalk: impara {{learning}} e parla {{speaks}}. Saluta e fate pratica insieme nell'app." }
    },
    "notFound": { "title": "Pagina non trovata | BananaTalk", "heading": "Questa pagina non esiste", "message": "Il link potrebbe essere vecchio o sbagliato. L'app, invece, è proprio qui.", "home": "Vai alla home", "download": "Scarica l'app" },
    "consent": { "message": "Usiamo cookie analitici per capire cosa porta le persone qui.", "accept": "OK", "decline": "No, grazie" },
    "footer": { "links": { "communities": "Community", "support": "Supporto", "download": "Scarica l'app" } },
    "home": { "stats": { "learners": "studenti" } }
  },
  "ru": {
    "seo": {
      "home": { "title": "BananaTalk: бесплатное приложение для языкового обмена с носителями", "description": "Практикуйтесь с носителями 137 языков. Пишите на своём, они читают на своём — и вы учитесь на разнице. Бесплатно для iOS и Android." },
      "download": { "title": "Скачать BananaTalk для iPhone и Android", "description": "Установите приложение для языкового обмена BananaTalk из App Store или Google Play. Чат с носителями, мгновенный перевод и ИИ-репетитор. Установка бесплатна." },
      "moments": { "title": "Моменты в BananaTalk: делитесь своим языковым путём", "description": "Моменты — короткие записи изучающих языки со всего мира. Смотрите, что учат другие, поддерживайте их и делитесь своими из приложения BananaTalk." },
      "privacy": { "title": "Политика конфиденциальности | BananaTalk", "description": "Как BananaTalk собирает, использует и защищает ваши данные и какой выбор у вас есть." },
      "terms": { "title": "Условия использования | BananaTalk", "description": "Правила использования BananaTalk: аккаунт, допустимое поведение, контент, подписки и как с нами связаться." },
      "support": { "title": "Поддержка и помощь | BananaTalk", "description": "Получите помощь с аккаунтом BananaTalk, сообщите о проблеме или свяжитесь с командой." },
      "dataDeletion": { "title": "Запрос на удаление данных | BananaTalk", "description": "Как удалить аккаунт BananaTalk и личные данные и что происходит после этого." },
      "profile": { "title": "{{name}} – учит {{learning}}, говорит на {{speaks}} · BananaTalk", "description": "{{name}} в BananaTalk учит {{learning}} и говорит на {{speaks}}. Поздоровайтесь и практикуйтесь вместе в приложении." }
    },
    "notFound": { "title": "Страница не найдена | BananaTalk", "heading": "Такой страницы нет", "message": "Ссылка могла устареть или содержать опечатку. А вот приложение — прямо здесь.", "home": "На главную", "download": "Скачать приложение" },
    "consent": { "message": "Мы используем аналитические cookie, чтобы понимать, что приводит сюда людей.", "accept": "ОК", "decline": "Нет, спасибо" },
    "footer": { "links": { "communities": "Сообщества", "support": "Поддержка", "download": "Скачать приложение" } },
    "home": { "stats": { "learners": "учащихся" } }
  },
  "ar": {
    "seo": {
      "home": { "title": "BananaTalk: تطبيق مجاني لتبادل اللغات مع متحدثين أصليين", "description": "تدرّب على التحدث مع متحدثين أصليين بـ137 لغة. اكتب بلغتك، يقرؤون بلغتهم، وتتعلم من الفارق. مجاني على iOS وAndroid." },
      "download": { "title": "حمّل BananaTalk لأجهزة iPhone وAndroid", "description": "احصل على تطبيق تبادل اللغات BananaTalk من App Store أو Google Play. دردش مع متحدثين أصليين، ترجمة فورية ومعلّم ذكاء اصطناعي. التثبيت مجاني." },
      "moments": { "title": "اللحظات على BananaTalk: شارك رحلتك مع اللغات", "description": "اللحظات منشورات قصيرة من متعلمي اللغات حول العالم. شاهد ما يتعلمه الناس، شجّعهم، وشارك لحظاتك من تطبيق BananaTalk." },
      "privacy": { "title": "سياسة الخصوصية | BananaTalk", "description": "كيف يجمع BananaTalk بياناتك ويستخدمها ويحميها، وما الخيارات المتاحة لك." },
      "terms": { "title": "شروط الاستخدام | BananaTalk", "description": "قواعد استخدام BananaTalk: حسابك، السلوك المقبول، المحتوى، الاشتراكات، وكيفية التواصل معنا." },
      "support": { "title": "الدعم والمساعدة | BananaTalk", "description": "احصل على مساعدة بشأن حسابك في BananaTalk، أبلغ عن مشكلة أو تواصل مع الفريق." },
      "dataDeletion": { "title": "طلب حذف البيانات | BananaTalk", "description": "كيفية حذف حسابك في BananaTalk وبياناتك الشخصية، وما يحدث بعد ذلك." },
      "profile": { "title": "{{name}} – يتعلم {{learning}} ويتحدث {{speaks}} على BananaTalk", "description": "{{name}} على BananaTalk يتعلم {{learning}} ويتحدث {{speaks}}. ألقِ التحية وتدرّبا معًا في التطبيق." }
    },
    "notFound": { "title": "الصفحة غير موجودة | BananaTalk", "heading": "هذه الصفحة غير موجودة", "message": "قد يكون الرابط قديمًا أو مكتوبًا بشكل خاطئ. أما التطبيق فهو هنا تمامًا.", "home": "الذهاب إلى الصفحة الرئيسية", "download": "تحميل التطبيق" },
    "consent": { "message": "نستخدم ملفات تعريف الارتباط التحليلية لفهم ما يجلب الناس إلى هنا.", "accept": "موافق", "decline": "لا، شكرًا" },
    "footer": { "links": { "communities": "المجتمعات", "support": "الدعم", "download": "تحميل التطبيق" } },
    "home": { "stats": { "learners": "متعلمون" } }
  },
  "hi": {
    "seo": {
      "home": { "title": "BananaTalk: नेटिव स्पीकर्स के साथ मुफ़्त भाषा विनिमय ऐप", "description": "137 भाषाओं के नेटिव स्पीकर्स के साथ बोलने का अभ्यास करें। आप अपनी भाषा में लिखें, वे अपनी में पढ़ें, और आप अंतर से सीखें। iOS और Android पर मुफ़्त।" },
      "download": { "title": "iPhone और Android के लिए BananaTalk डाउनलोड करें", "description": "App Store या Google Play से BananaTalk भाषा विनिमय ऐप पाएँ। नेटिव स्पीकर्स से चैट, तुरंत अनुवाद और AI ट्यूटर। इंस्टॉल मुफ़्त है।" },
      "moments": { "title": "BananaTalk पर Moments: अपनी भाषा यात्रा साझा करें", "description": "Moments दुनिया भर के भाषा सीखने वालों की छोटी पोस्ट हैं। देखें लोग क्या सीख रहे हैं, उनका हौसला बढ़ाएँ और BananaTalk ऐप से अपनी पोस्ट साझा करें।" },
      "privacy": { "title": "गोपनीयता नीति | BananaTalk", "description": "BananaTalk आपका डेटा कैसे एकत्र, उपयोग और सुरक्षित करता है, और आपके पास कौन से विकल्प हैं।" },
      "terms": { "title": "उपयोग की शर्तें | BananaTalk", "description": "BananaTalk के उपयोग के नियम: आपका खाता, स्वीकार्य आचरण, सामग्री, सब्सक्रिप्शन और हमसे संपर्क कैसे करें।" },
      "support": { "title": "सहायता और मदद | BananaTalk", "description": "अपने BananaTalk खाते में मदद पाएँ, समस्या की रिपोर्ट करें या टीम से संपर्क करें।" },
      "dataDeletion": { "title": "डेटा हटाने का अनुरोध | BananaTalk", "description": "अपना BananaTalk खाता और व्यक्तिगत डेटा कैसे हटाएँ, और ऐसा करने पर क्या होता है।" },
      "profile": { "title": "{{name}} – {{learning}} सीख रहे हैं, {{speaks}} बोलते हैं · BananaTalk", "description": "{{name}} BananaTalk पर {{learning}} सीख रहे हैं और {{speaks}} बोलते हैं। नमस्ते कहें और ऐप में साथ अभ्यास करें।" }
    },
    "notFound": { "title": "पेज नहीं मिला | BananaTalk", "heading": "यह पेज मौजूद नहीं है", "message": "लिंक पुराना या गलत टाइप किया हुआ हो सकता है। लेकिन ऐप यहीं है।", "home": "होमपेज पर जाएँ", "download": "ऐप डाउनलोड करें" },
    "consent": { "message": "हम यह समझने के लिए एनालिटिक्स कुकीज़ का उपयोग करते हैं कि लोग यहाँ कैसे आते हैं।", "accept": "ठीक है", "decline": "नहीं, धन्यवाद" },
    "footer": { "links": { "communities": "समुदाय", "support": "सहायता", "download": "ऐप डाउनलोड करें" } },
    "home": { "stats": { "learners": "सीखने वाले" } }
  },
  "id": {
    "seo": {
      "home": { "title": "BananaTalk: Aplikasi Tukar Bahasa Gratis dengan Penutur Asli", "description": "Berlatih bicara dengan penutur asli dalam 137 bahasa. Tulis dalam bahasamu, mereka membaca dalam bahasa mereka, dan kamu belajar dari perbedaannya. Gratis di iOS dan Android." },
      "download": { "title": "Unduh BananaTalk untuk iPhone dan Android", "description": "Dapatkan aplikasi tukar bahasa BananaTalk di App Store atau Google Play. Chat dengan penutur asli, terjemahan instan, dan tutor AI. Gratis dipasang." },
      "moments": { "title": "Moments di BananaTalk: Bagikan Perjalanan Bahasamu", "description": "Moments adalah postingan singkat dari pembelajar bahasa di seluruh dunia. Lihat apa yang mereka pelajari, beri semangat, dan bagikan milikmu dari aplikasi BananaTalk." },
      "privacy": { "title": "Kebijakan Privasi | BananaTalk", "description": "Cara BananaTalk mengumpulkan, menggunakan, dan melindungi datamu, serta pilihan yang kamu miliki." },
      "terms": { "title": "Ketentuan Penggunaan | BananaTalk", "description": "Aturan penggunaan BananaTalk: akun, perilaku yang dapat diterima, konten, langganan, dan cara menghubungi kami." },
      "support": { "title": "Dukungan dan Bantuan | BananaTalk", "description": "Dapatkan bantuan untuk akun BananaTalk-mu, laporkan masalah, atau hubungi tim." },
      "dataDeletion": { "title": "Permintaan Penghapusan Data | BananaTalk", "description": "Cara menghapus akun BananaTalk dan data pribadimu, serta apa yang terjadi setelahnya." },
      "profile": { "title": "{{name}} – belajar {{learning}}, bicara {{speaks}} di BananaTalk", "description": "{{name}} ada di BananaTalk, belajar {{learning}} dan berbicara {{speaks}}. Sapa dan berlatih bersama di aplikasi." }
    },
    "notFound": { "title": "Halaman tidak ditemukan | BananaTalk", "heading": "Halaman ini tidak ada", "message": "Tautannya mungkin sudah lama atau salah ketik. Aplikasinya, sebaliknya, ada di sini.", "home": "Ke beranda", "download": "Unduh aplikasi" },
    "consent": { "message": "Kami memakai cookie analitik untuk memahami apa yang membawa orang ke sini.", "accept": "OK", "decline": "Tidak, terima kasih" },
    "footer": { "links": { "communities": "Komunitas", "support": "Dukungan", "download": "Unduh aplikasi" } },
    "home": { "stats": { "learners": "pembelajar" } }
  },
  "th": {
    "seo": {
      "home": { "title": "BananaTalk: แอปแลกเปลี่ยนภาษาฟรีกับเจ้าของภาษา", "description": "ฝึกพูดกับเจ้าของภาษา 137 ภาษา คุณเขียนภาษาของคุณ เขาอ่านภาษาของเขา แล้วเรียนรู้จากความต่าง ฟรีบน iOS และ Android" },
      "download": { "title": "ดาวน์โหลด BananaTalk สำหรับ iPhone และ Android", "description": "รับแอปแลกเปลี่ยนภาษา BananaTalk ได้ที่ App Store หรือ Google Play แชทกับเจ้าของภาษา แปลทันที และติวเตอร์ AI ติดตั้งฟรี" },
      "moments": { "title": "Moments บน BananaTalk: แบ่งปันเส้นทางการเรียนภาษาของคุณ", "description": "Moments คือโพสต์สั้น ๆ จากผู้เรียนภาษาทั่วโลก ดูว่าคนอื่นเรียนอะไร ส่งกำลังใจ และแบ่งปันของคุณจากแอป BananaTalk" },
      "privacy": { "title": "นโยบายความเป็นส่วนตัว | BananaTalk", "description": "BananaTalk เก็บ ใช้ และปกป้องข้อมูลของคุณอย่างไร และคุณมีทางเลือกอะไรบ้าง" },
      "terms": { "title": "ข้อกำหนดการใช้งาน | BananaTalk", "description": "กฎการใช้ BananaTalk: บัญชี พฤติกรรมที่ยอมรับได้ เนื้อหา การสมัครสมาชิก และวิธีติดต่อเรา" },
      "support": { "title": "ฝ่ายสนับสนุนและความช่วยเหลือ | BananaTalk", "description": "ขอความช่วยเหลือเกี่ยวกับบัญชี BananaTalk รายงานปัญหา หรือติดต่อทีมงาน" },
      "dataDeletion": { "title": "คำขอลบข้อมูล | BananaTalk", "description": "วิธีลบบัญชี BananaTalk และข้อมูลส่วนตัวของคุณ และสิ่งที่จะเกิดขึ้นหลังจากนั้น" },
      "profile": { "title": "{{name}} – กำลังเรียน {{learning}} พูด {{speaks}} บน BananaTalk", "description": "{{name}} อยู่บน BananaTalk กำลังเรียน {{learning}} และพูด {{speaks}} ทักทายและฝึกด้วยกันในแอป" }
    },
    "notFound": { "title": "ไม่พบหน้า | BananaTalk", "heading": "ไม่มีหน้านี้", "message": "ลิงก์อาจเก่าหรือพิมพ์ผิด แต่แอปอยู่ตรงนี้แล้ว", "home": "ไปหน้าแรก", "download": "ดาวน์โหลดแอป" },
    "consent": { "message": "เราใช้คุกกี้วิเคราะห์เพื่อทำความเข้าใจว่าอะไรพาผู้คนมาที่นี่", "accept": "ตกลง", "decline": "ไม่เป็นไร" },
    "footer": { "links": { "communities": "ชุมชน", "support": "ฝ่ายสนับสนุน", "download": "ดาวน์โหลดแอป" } },
    "home": { "stats": { "learners": "ผู้เรียน" } }
  },
  "tl": {
    "seo": {
      "home": { "title": "BananaTalk: Libreng Language Exchange App kasama ang mga Native Speaker", "description": "Magsanay magsalita kasama ang mga native speaker sa 137 wika. Sumulat sa iyong wika, babasahin nila sa kanila, at matututo ka sa pagkakaiba. Libre sa iOS at Android." },
      "download": { "title": "I-download ang BananaTalk para sa iPhone at Android", "description": "Kunin ang BananaTalk language exchange app sa App Store o Google Play. Mag-chat sa mga native speaker, instant na pagsasalin at AI tutor. Libre ang pag-install." },
      "moments": { "title": "Moments sa BananaTalk: Ibahagi ang Iyong Language Journey", "description": "Ang Moments ay mga maiikling post mula sa mga nag-aaral ng wika sa buong mundo. Tingnan kung ano ang pinag-aaralan nila, suportahan sila, at ibahagi ang sa iyo mula sa BananaTalk app." },
      "privacy": { "title": "Patakaran sa Privacy | BananaTalk", "description": "Paano kinokolekta, ginagamit at pinoprotektahan ng BananaTalk ang iyong data, at ang mga pagpipilian mo." },
      "terms": { "title": "Mga Tuntunin ng Paggamit | BananaTalk", "description": "Ang mga patakaran sa paggamit ng BananaTalk: account, katanggap-tanggap na asal, content, subscription at kung paano kami makontak." },
      "support": { "title": "Suporta at Tulong | BananaTalk", "description": "Humingi ng tulong sa iyong BananaTalk account, mag-report ng problema o makipag-ugnayan sa team." },
      "dataDeletion": { "title": "Kahilingan sa Pagbura ng Data | BananaTalk", "description": "Paano burahin ang iyong BananaTalk account at personal na data, at ano ang mangyayari pagkatapos." },
      "profile": { "title": "{{name}} – nag-aaral ng {{learning}}, nagsasalita ng {{speaks}} sa BananaTalk", "description": "Si {{name}} ay nasa BananaTalk, nag-aaral ng {{learning}} at nagsasalita ng {{speaks}}. Kumustahin at magsanay nang magkasama sa app." }
    },
    "notFound": { "title": "Hindi mahanap ang page | BananaTalk", "heading": "Wala ang page na ito", "message": "Maaaring luma o maling na-type ang link. Ang app naman, nandito lang.", "home": "Pumunta sa homepage", "download": "I-download ang app" },
    "consent": { "message": "Gumagamit kami ng analytics cookies para maunawaan kung ano ang nagdadala ng mga tao dito.", "accept": "OK", "decline": "Hindi, salamat" },
    "footer": { "links": { "communities": "Mga Komunidad", "support": "Suporta", "download": "I-download ang app" } },
    "home": { "stats": { "learners": "mga nag-aaral" } }
  },
  "tr": {
    "seo": {
      "home": { "title": "BananaTalk: Anadili Konuşanlarla Ücretsiz Dil Değişimi Uygulaması", "description": "137 dilde anadili konuşanlarla pratik yapın. Siz kendi dilinizde yazın, onlar kendi dillerinde okusun; farktan öğrenin. iOS ve Android'de ücretsiz." },
      "download": { "title": "iPhone ve Android için BananaTalk'u İndir", "description": "BananaTalk dil değişimi uygulamasını App Store veya Google Play'den edinin. Anadili konuşanlarla sohbet, anında çeviri ve yapay zekâ öğretmeni. Kurulum ücretsiz." },
      "moments": { "title": "BananaTalk'ta Anlar: Dil Yolculuğunu Paylaş", "description": "Anlar, dünyanın dört bir yanındaki dil öğrenenlerin kısa paylaşımlarıdır. Ne öğrendiklerini görün, onları destekleyin ve kendi anlarınızı BananaTalk uygulamasından paylaşın." },
      "privacy": { "title": "Gizlilik Politikası | BananaTalk", "description": "BananaTalk verilerinizi nasıl toplar, kullanır ve korur; hangi seçeneklere sahipsiniz." },
      "terms": { "title": "Kullanım Koşulları | BananaTalk", "description": "BananaTalk kullanım kuralları: hesabınız, kabul edilebilir davranış, içerik, abonelikler ve bize nasıl ulaşırsınız." },
      "support": { "title": "Destek ve Yardım | BananaTalk", "description": "BananaTalk hesabınız için yardım alın, bir sorun bildirin veya ekiple iletişime geçin." },
      "dataDeletion": { "title": "Veri Silme Talebi | BananaTalk", "description": "BananaTalk hesabınızı ve kişisel verilerinizi nasıl silersiniz ve sonrasında ne olur." },
      "profile": { "title": "{{name}} – {{learning}} öğreniyor, {{speaks}} konuşuyor · BananaTalk", "description": "{{name}} BananaTalk'ta {{learning}} öğreniyor ve {{speaks}} konuşuyor. Selam verin, uygulamada birlikte pratik yapın." }
    },
    "notFound": { "title": "Sayfa bulunamadı | BananaTalk", "heading": "Böyle bir sayfa yok", "message": "Bağlantı eski ya da yanlış yazılmış olabilir. Uygulama ise tam burada.", "home": "Ana sayfaya git", "download": "Uygulamayı indir" },
    "consent": { "message": "İnsanları buraya neyin getirdiğini anlamak için analitik çerezler kullanıyoruz.", "accept": "Tamam", "decline": "Hayır, teşekkürler" },
    "footer": { "links": { "communities": "Topluluklar", "support": "Destek", "download": "Uygulamayı indir" } },
    "home": { "stats": { "learners": "öğrenen" } }
  },
  "vi": {
    "seo": {
      "home": { "title": "BananaTalk: Ứng dụng trao đổi ngôn ngữ miễn phí với người bản xứ", "description": "Luyện nói với người bản xứ của 137 ngôn ngữ. Bạn viết bằng tiếng của bạn, họ đọc bằng tiếng của họ, và bạn học từ sự khác biệt. Miễn phí trên iOS và Android." },
      "download": { "title": "Tải BananaTalk cho iPhone và Android", "description": "Tải ứng dụng trao đổi ngôn ngữ BananaTalk trên App Store hoặc Google Play. Trò chuyện với người bản xứ, dịch tức thì và gia sư AI. Cài đặt miễn phí." },
      "moments": { "title": "Moments trên BananaTalk: Chia sẻ hành trình ngôn ngữ của bạn", "description": "Moments là những bài đăng ngắn từ người học ngôn ngữ khắp thế giới. Xem mọi người đang học gì, cổ vũ họ và chia sẻ của bạn từ ứng dụng BananaTalk." },
      "privacy": { "title": "Chính sách quyền riêng tư | BananaTalk", "description": "Cách BananaTalk thu thập, sử dụng và bảo vệ dữ liệu của bạn, và những lựa chọn bạn có." },
      "terms": { "title": "Điều khoản sử dụng | BananaTalk", "description": "Quy tắc sử dụng BananaTalk: tài khoản, hành vi được chấp nhận, nội dung, gói đăng ký và cách liên hệ với chúng tôi." },
      "support": { "title": "Hỗ trợ và trợ giúp | BananaTalk", "description": "Nhận trợ giúp về tài khoản BananaTalk, báo cáo sự cố hoặc liên hệ với đội ngũ." },
      "dataDeletion": { "title": "Yêu cầu xóa dữ liệu | BananaTalk", "description": "Cách xóa tài khoản BananaTalk và dữ liệu cá nhân của bạn, và điều gì xảy ra sau đó." },
      "profile": { "title": "{{name}} – đang học {{learning}}, nói {{speaks}} trên BananaTalk", "description": "{{name}} đang ở trên BananaTalk, học {{learning}} và nói {{speaks}}. Hãy chào hỏi và cùng luyện tập trong ứng dụng." }
    },
    "notFound": { "title": "Không tìm thấy trang | BananaTalk", "heading": "Trang này không tồn tại", "message": "Liên kết có thể đã cũ hoặc gõ sai. Còn ứng dụng thì ở ngay đây.", "home": "Về trang chủ", "download": "Tải ứng dụng" },
    "consent": { "message": "Chúng tôi dùng cookie phân tích để hiểu điều gì đưa mọi người đến đây.", "accept": "OK", "decline": "Không, cảm ơn" },
    "footer": { "links": { "communities": "Cộng đồng", "support": "Hỗ trợ", "download": "Tải ứng dụng" } },
    "home": { "stats": { "learners": "người học" } }
  }
}
```

- [ ] **Step 5: Merge and verify the diff is additive**

Run: `node scripts/merge-locales.js scripts/locales/phase-a.json && git diff --stat src/utils/locales/ | tail -1`
Expected: 18 lines printed (`merged seo, notFound, consent, footer, home into <code>.json`), and the diff stat shows roughly +50 lines per file with **no deletions** beyond a handful of trailing-brace reflows. If a file shows hundreds of deletions, its indentation was not detected — open it, confirm the indent (4 spaces), and fix `merge-locales.js`'s regex rather than committing a reformatted file. Note: the working tree already had uncommitted locale edits from another task; `git diff` shows both. That is fine — stage the files anyway; this task's commit carries both.

- [ ] **Step 6: Run the parity test and the SEO copy test**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/localeParity.test.ts src/seo/pages.test.ts`
Expected: PASS both, including the `copy` block from Task 5 (titles ≤ 60, descriptions ≤ 160, primaries present).

- [ ] **Step 7: Write the failing page-wiring test**

```tsx
// src/seo/publicPagesMeta.test.tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider, FilledContext } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createAppStore } from "../store";
import HomeMain from "../components/home/HomeMain";
import DownloadApp from "../components/download/DownloadApp";
import MomentsAppPromo from "../components/moments/MomentsAppPromo";
import PrivacyPolicy from "../components/navbar/PrivacyPolicy";
import TermsOfUse from "../components/navbar/TermsOfUse";
import SupportMain from "../components/support/SupportMain";
import DataDeletion from "../components/navbar/DataDeletion";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "" }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Each indexed page must own its <head>. Rendering server-side and reading
// the helmet context is deterministic; jsdom applies helmet asynchronously.
const headOf = (ui: React.ReactElement, path: string) => {
  const ctx = {} as FilledContext;
  renderToString(
    <HelmetProvider context={ctx}>
      <Provider store={createAppStore()}>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </Provider>
    </HelmetProvider>
  );
  return ctx.helmet.title.toString() + ctx.helmet.link.toString() + ctx.helmet.meta.toString();
};

it.each([
  ["/", <HomeMain />, "Free Language Exchange App"],
  ["/download", <DownloadApp />, "Download BananaTalk"],
  ["/moments", <MomentsAppPromo />, "Moments on BananaTalk"],
  ["/privacy-policy", <PrivacyPolicy />, "Privacy Policy"],
  ["/terms-of-use", <TermsOfUse />, "Terms of Use"],
  ["/support", <SupportMain />, "Support and Help"],
  ["/data-deletion", <DataDeletion />, "Data Deletion Request"],
])("%s sets its own title and canonical", (path, ui, titleFragment) => {
  const head = headOf(ui as React.ReactElement, path as string);
  expect(head).toContain(titleFragment as string);
  // PageMeta renders SITE_ORIGIN + page.path, so "/" is "https://banatalk.com/".
  expect(head).toContain(`rel="canonical" href="https://banatalk.com${path}"`);
  expect(head).toContain("index, follow");
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/seo/publicPagesMeta.test.tsx`
Expected: FAIL for all seven — the titles are absent (only the App default would set one, and App is not in this tree).

If `HomeMain` throws because `useGetVipPlansQuery`/`useCountUp` need something, the `Provider` above supplies the store; `HeroDemo`/`StatStrip` render fine under `renderToString` (they were made server-safe in Task 3; `useInView`/`useCountUp` guard `window`). If `MomentsAppPromo`, `SupportMain` or another page throws `ReferenceError` here, it is reading a browser global in render — fix that component the same way as Task 3 and note it in the commit.

- [ ] **Step 9: Add `<PageMeta route=… />` to each page**

In each file, `import PageMeta from "../../seo/PageMeta";` (adjust the relative depth: `home/`, `download/`, `moments/`, `navbar/`, `support/` are all two levels below `src/`) and render it as the first child of the component's top-level element:

- `src/components/home/HomeMain.tsx`: first child inside the fragment/wrapper that contains `<PromoCarousel />` → `<PageMeta route="/" />`
- `src/components/download/DownloadApp.tsx`: inside `<div className="download-page">` → `<PageMeta route="/download" />`
- `src/components/moments/MomentsAppPromo.tsx`: `<PageMeta route="/moments" />`
- `src/components/navbar/PrivacyPolicy.tsx`: `<PageMeta route="/privacy-policy" />`
- `src/components/navbar/TermsOfUse.tsx`: `<PageMeta route="/terms-of-use" />`
- `src/components/support/SupportMain.tsx`: `<PageMeta route="/support" />`
- `src/components/navbar/DataDeletion.tsx`: `<PageMeta route="/data-deletion" />`

Then the dynamic profile, in `src/components/community/CommunityDetail.tsx`: `import PageMeta from "../../seo/PageMeta";` and, in the main (loaded) return — the JSX returned after the `if (isLoading)` / error / not-found early returns — add as the first child of its outermost element:

```tsx
      {isPublic && memberDetails && (
        <PageMeta
          route="/profile/:userId"
          values={{
            name: memberDetails.name || "",
            learning: memberDetails.language_to_learn || "",
            speaks: memberDetails.native_language || "",
          }}
        />
      )}
```

`memberDetails` is the already-existing local for `data?.data` used at lines ~645-648. The loading and error states deliberately render nothing here so the layout's `noindex` default holds until real data exists (spec §4.1).

- [ ] **Step 10: Run the wiring test and the whole suite**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS. Existing page tests that render these components without `HelmetProvider` will now fail with `Cannot read properties of undefined (reading 'add')`; wrap those test trees in `<HelmetProvider>` (import from `react-helmet-async`). Known candidates: `src/components/home/HomeMain.test.tsx`, `src/components/moments/MomentsAppPromo.test.tsx`, `src/components/navbar/legalPages.test.tsx` (Task 4 — add the provider there too).

- [ ] **Step 11: Commit**

```bash
git add scripts/merge-locales.js scripts/locales/phase-a.json src/utils/locales/*.json src/utils/localeParity.test.ts src/seo/publicPagesMeta.test.tsx src/components/home/HomeMain.tsx src/components/download/DownloadApp.tsx src/components/moments/MomentsAppPromo.tsx src/components/navbar/PrivacyPolicy.tsx src/components/navbar/TermsOfUse.tsx src/components/support/SupportMain.tsx src/components/navbar/DataDeletion.tsx src/components/community/CommunityDetail.tsx src/components/home/HomeMain.test.tsx src/components/moments/MomentsAppPromo.test.tsx src/components/navbar/legalPages.test.tsx
git commit -m "feat(seo): per-page metadata on every indexed route; seo/notFound/consent locales in 18 languages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: A real 404 page and the catch-all route

**Files:**
- Modify: `src/components/error/NotFound.tsx` (rewrite in place — the spec names `errors/`, the repo already has `error/`; keep the existing directory)
- Modify: `src/router/routes.tsx` (add `<Route path="*" element={<NotFound />} />` as the last child)
- Test: `src/components/error/NotFound.test.tsx`

**Interfaces:**
- `NotFound` renders exactly one `<h1>`, a link to `/` and a link to `/download`, and `<PageMeta noindex title=… />`. Copy keys: `notFound.title`, `notFound.heading`, `notFound.message`, `notFound.home`, `notFound.download` (added in Task 7).
- The prerenderer (Task 12) renders the path `/404`, which matches `*`, and writes it to `build/404.html`; nginx serves that file for real 404s (Task 15).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/error/NotFound.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

// Swappable `t`: echo keys in one case, miss everything in the other.
let tImpl: (k: string) => string = (k) => k;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => tImpl(k) }) }));

const renderPage = (t: (k: string) => string) => {
  tImpl = t;
  return render(
    <HelmetProvider><MemoryRouter initialEntries={["/nope"]}><NotFound /></MemoryRouter></HelmetProvider>
  );
};

it("renders one h1 and links home and to the download page (keys echoed)", () => {
  const { container } = renderPage((k) => k);
  expect(container.querySelectorAll("h1")).toHaveLength(1);
  expect(screen.getByText("notFound.heading")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "notFound.home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "notFound.download" })).toHaveAttribute("href", "/download");
});

it("falls back to English when i18n has no key", () => {
  renderPage(() => "");
  expect(screen.getByText("This page doesn't exist")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to the homepage" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/error/NotFound.test.tsx`
Expected: FAIL — the current component has no links and hardcoded text.

- [ ] **Step 3: Rewrite `src/components/error/NotFound.tsx`**

```tsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "../../seo/PageMeta";

/**
 * The catch-all route and, prerendered, build/404.html. Noindex: a 404 that
 * gets indexed is a soft-404 with extra steps. Short on purpose — the useful
 * thing on this page is the way out.
 */
const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="not-found" className="mx-auto max-w-xl px-4 py-24 text-center">
      <PageMeta noindex title={t("notFound.title") || "Page not found | BananaTalk"} />
      <p className="text-5xl" aria-hidden>🍌</p>
      <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-gray-50">
        {t("notFound.heading") || "This page doesn't exist"}
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">
        {t("notFound.message") || "The link may be old or mistyped. The app, on the other hand, is right here."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-bold text-gray-800 dark:border-gray-600 dark:text-gray-100">
          {t("notFound.home") || "Go to the homepage"}
        </Link>
        <Link to="/download" className="rounded-full bg-brand px-5 py-2 text-sm font-extrabold text-white shadow-brand">
          {t("notFound.download") || "Download the app"}
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
```

- [ ] **Step 4: Add the catch-all route**

In `src/router/routes.tsx`, add `import NotFound from "../components/error/NotFound";` and, as the **last** child inside `<Route path="/" element={<App />}>`:

```tsx
      {/* Catch-all. Prerendered as build/404.html; nginx's error_page points at it. */}
      <Route path="*" element={<NotFound />} />
```

- [ ] **Step 5: Run the test, then the router test**

Run: `CI=true npx react-scripts test --watchAll=false src/components/error src/router`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/error/NotFound.tsx src/components/error/NotFound.test.tsx src/router/routes.tsx
git commit -m "feat(404): real not-found page on a catch-all route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: `public/index.html` and `manifest.json` cleanup

**Files:**
- Modify: `public/index.html`
- Modify: `public/manifest.json:23`
- Test: `src/publicAssets.test.ts` (new; reads the files with `fs`)

**Interfaces:** none. Spec §4.1: remove the 19 `hreflang` links (the app has no per-language URLs), change "50+ Languages" to "137 Languages" in the `<title>`, and make `manifest.json`'s `theme_color` `#14B8A6` to match the `theme-color` meta. The static description/OG/canonical tags stay as the fallback for routes that set nothing (the prerenderer replaces them per route in Task 13).

- [ ] **Step 1: Write the failing test**

```ts
// src/publicAssets.test.ts
/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", "public", p), "utf8");

it("index.html carries no hreflang alternates (there are no per-language URLs)", () => {
  expect(read("index.html")).not.toMatch(/hreflang=/);
});

it("index.html's title agrees with the page about the language count", () => {
  const title = /<title>([^<]*)<\/title>/.exec(read("index.html"))![1];
  expect(title).toContain("137 Languages");
  expect(title).not.toContain("50+");
});

it("manifest theme_color matches the theme-color meta", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const meta = /<meta name="theme-color" content="([^"]+)"/.exec(read("index.html"))![1];
  expect(manifest.theme_color.toUpperCase()).toBe(meta.toUpperCase());
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/publicAssets.test.ts`
Expected: FAIL on all three.

- [ ] **Step 3: Edit the files**

In `public/index.html`:
- delete every line matching `<link rel="alternate" hreflang=` (19 of them; `grep -c hreflang public/index.html` must print `0` afterwards);
- line 232: change `Learn 50+ Languages` to `Learn 137 Languages` in the `<title>`.

In `public/manifest.json` line 23: `"theme_color": "#FFD700",` → `"theme_color": "#14B8A6",`.

- [ ] **Step 4: Run the test**

Run: `CI=true npx react-scripts test --watchAll=false src/publicAssets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/manifest.json src/publicAssets.test.ts
git commit -m "fix(seo): drop false hreflang alternates, align title and theme colour with the page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: English-first i18n (hydration-safe language detection)

**Files:**
- Modify: `src/utils/i18n.ts`
- Modify: `src/components/navbar/MainNavbar.tsx:125-128`
- Modify: `src/components/settings/LanguageSettings.tsx:69`
- Modify: `src/App.tsx`
- Test: `src/utils/i18n.test.ts` (new)

**Interfaces:**
- `i18n.ts` now initialises with `lng: "en"` and `detection.caches: []`, so the first render — server and client — is English and nothing is written to storage by detection.
- Produces: `export async function applyDetectedLanguage(): Promise<void>` (runs the browser detector, switches language if it differs, then the existing geo-IP probe) and `export function rememberLanguageChoice(lng: string): void` (writes `i18nextLng`, the detector's storage key, only on explicit user choice).
- Consumed by: `App.tsx` (effect after mount), `MainNavbar`, `LanguageSettings`.
- Why: spec §4.2 "Hydration". A stored or detected non-English language applies right after hydration; the flash is accepted.

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/i18n.test.ts
// The module initialises i18next at import, so each case loads it fresh.
const loadFresh = () => {
  jest.resetModules();
  return require("./i18n") as typeof import("./i18n");
};

const setNavigatorLanguage = (lng: string) => {
  Object.defineProperty(window.navigator, "language", { value: lng, configurable: true });
  Object.defineProperty(window.navigator, "languages", { value: [lng], configurable: true });
};

beforeEach(() => window.localStorage.clear());

it("starts in English even when the browser prefers another language", () => {
  setNavigatorLanguage("ko-KR");
  const { default: i18n } = loadFresh();
  expect(i18n.language).toBe("en");
});

it("applyDetectedLanguage switches to the detected language without caching it", async () => {
  setNavigatorLanguage("ko-KR");
  const { default: i18n, applyDetectedLanguage } = loadFresh();
  await applyDetectedLanguage();
  // `language` keeps the detector's "ko-KR"; `resolvedLanguage` is what resources resolve to.
  expect(i18n.resolvedLanguage).toBe("ko");
  expect(window.localStorage.getItem("i18nextLng")).toBeNull();
});

it("a stored explicit choice wins over the browser language", async () => {
  setNavigatorLanguage("ko-KR");
  window.localStorage.setItem("i18nextLng", "es");
  const { default: i18n, applyDetectedLanguage } = loadFresh();
  await applyDetectedLanguage();
  expect(i18n.resolvedLanguage).toBe("es");
});

it("rememberLanguageChoice writes the detector's storage key", () => {
  const { rememberLanguageChoice } = loadFresh();
  rememberLanguageChoice("ja");
  expect(window.localStorage.getItem("i18nextLng")).toBe("ja");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/i18n.test.ts`
Expected: FAIL — first test gets `"ko"` (detection ran at init); `applyDetectedLanguage` is not a function.

- [ ] **Step 3: Change the init in `src/utils/i18n.ts`**

In the `.init({ ... })` call:
- add `lng: "en",` directly above `fallbackLng: "en",` with the comment:
  ```ts
      // English first, always. The prerendered HTML is English; the first client
      // render must match it or React throws the markup away. Detection runs in
      // applyDetectedLanguage() from an effect after hydration.
      lng: "en",
  ```
- in `detection`, change `caches: ["localStorage"],` to `caches: [],` with the comment `// Never auto-cache: changeLanguage("en") at init would otherwise overwrite a real user choice. rememberLanguageChoice() writes the key on explicit choice only.`

- [ ] **Step 4: Replace the deferred geo probe with the exported functions**

Delete the block at the end of the file:

```ts
// Defer the geo-IP probe until after first paint so it never blocks
// the initial render.
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(detectByGeoIp, { timeout: 2000 });
  } else {
    setTimeout(detectByGeoIp, 800);
  }
}
```

and put this in its place (above `export default i18n;`):

```ts
/** Persist an explicit user choice where the detector will find it next visit. */
export function rememberLanguageChoice(lng: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Storage unavailable — the choice still applies for this session.
  }
}

/**
 * Run after hydration: stored choice → browser language → geo-IP fallback.
 * Never called during render, never on the server.
 */
export async function applyDetectedLanguage(): Promise<void> {
  if (typeof window === "undefined") return;
  const detector = i18n.services.languageDetector as
    | { detect?: () => string | string[] | undefined }
    | undefined;
  const raw = detector && detector.detect ? detector.detect() : undefined;
  const detected = Array.isArray(raw) ? raw[0] : raw;
  if (detected && detected !== i18n.language) {
    await i18n.changeLanguage(detected);
  }
  await detectByGeoIp();
}
```

`i18next` resolves `"ko-KR"` to `ko` through the existing `load: "languageOnly"` + `nonExplicitSupportedLngs`.

- [ ] **Step 5: Record explicit choices**

`src/components/navbar/MainNavbar.tsx`, in `changeLanguage` (line ~125): add `import { rememberLanguageChoice } from "../../utils/i18n";` and insert `rememberLanguageChoice(lng);` directly after `i18n.changeLanguage(lng);` (keep the existing `preferredLanguage` write).

`src/components/settings/LanguageSettings.tsx` line ~69: same import (`../../utils/i18n`) and `rememberLanguageChoice(code);` after `i18n.changeLanguage(code);`.

- [ ] **Step 6: Apply detection after mount in `src/App.tsx`**

Change the import to `import i18n, { applyDetectedLanguage } from "./utils/i18n";` and add, next to the existing analytics effect:

```tsx
  // First render is English to match the prerendered HTML; the user's real
  // language applies here, once the DOM is ours.
  useEffect(() => {
    applyDetectedLanguage();
  }, []);
```

- [ ] **Step 7: Run the test and the suite**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/i18n.test.ts && CI=true npx react-scripts test --watchAll=false`
Expected: PASS. Tests that mock `react-i18next` wholesale are unaffected (they never import `utils/i18n`).

- [ ] **Step 8: Commit**

```bash
git add src/utils/i18n.ts src/utils/i18n.test.ts src/components/navbar/MainNavbar.tsx src/components/settings/LanguageSettings.tsx src/App.tsx
git commit -m "feat(i18n): render English first, detect language after mount, cache only explicit choices

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Learner count — `publicStatsSlice` and `StatStrip`

**Files:**
- Modify: `src/constants.ts`
- Create: `src/store/slices/publicStatsSlice.ts`
- Modify: `src/components/home/parts/StatStrip.tsx`
- Test: `src/store/slices/publicStatsSlice.test.ts`, `src/components/home/parts/StatStrip.test.tsx` (new), `src/components/home/parts/staticSections.test.tsx` and `src/components/home/HomeMain.test.tsx` (mock added)

**Interfaces:**
- `export const PUBLIC_STATS_URL = "/api/v1/public/stats";` in `constants.ts`.
- `publicStatsSlice.ts` produces `export interface PublicStats { learners: number | null; languages: number; countries: number | null; generatedAt: string; }`, `export const publicStatsApiSlice` (injected endpoints, `getPublicStats: query<PublicStats, void>`), `export const { useGetPublicStatsQuery }`. Response envelope from the backend (Task 20) is `{ success: true, data: PublicStats }`; `transformResponse` unwraps `data`.
- `StatStrip` shows `learners` as the first stat when `data.learners` is a number, else the four curated stats unchanged. Formatting: `toLocaleString("en-US")` (server and client agree).
- Consumed by: Task 12 prefetch (`publicStatsApiSlice.endpoints.getPublicStats.initiate()`).

- [ ] **Step 1: Write the failing slice test**

```ts
// src/store/slices/publicStatsSlice.test.ts
import { publicStatsApiSlice } from "./publicStatsSlice";
import { createAppStore } from "../index";

it("unwraps the backend envelope", () => {
  const endpoint = publicStatsApiSlice.endpoints.getPublicStats as any;
  const raw = { success: true, data: { learners: 12000, languages: 137, countries: 41, generatedAt: "2026-09-22T00:00:00.000Z" } };
  expect(endpoint.transformResponse(raw)).toEqual(raw.data);
});

it("targets the public stats URL", () => {
  const endpoint = publicStatsApiSlice.endpoints.getPublicStats as any;
  expect(endpoint.query()).toEqual({ url: "/api/v1/public/stats" });
});

it("initiate() from a fresh store settles with an error when there is no network", async () => {
  const store = createAppStore();
  (global as any).fetch = jest.fn(() => Promise.reject(new Error("offline")));
  const result: any = await store.dispatch(publicStatsApiSlice.endpoints.getPublicStats.initiate());
  expect(result.error).toBeDefined();
  expect(result.data).toBeUndefined();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/store/slices/publicStatsSlice.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the constant and the slice**

`src/constants.ts` — append after `VIP_PLANS_URL`:

```ts
// Public, cached 1h server-side: { learners, languages, countries, generatedAt }.
// Feeds StatStrip; see language_exchange_backend_application routes/public.js.
export const PUBLIC_STATS_URL = "/api/v1/public/stats";
```

`src/store/slices/publicStatsSlice.ts`:

```ts
import { apiSlice } from "./apiSlice";
import { PUBLIC_STATS_URL } from "../../constants";

/** Shape of GET /api/v1/public/stats `data`. Figures are rounded down to two
 *  significant figures server-side; `learners` is null under 1,000. */
export interface PublicStats {
  learners: number | null;
  languages: number;
  countries: number | null;
  generatedAt: string;
}

export const publicStatsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicStats: builder.query<PublicStats, void>({
      query: () => ({ url: PUBLIC_STATS_URL }),
      transformResponse: (response: any): PublicStats =>
        response && response.data ? response.data : response,
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetPublicStatsQuery } = publicStatsApiSlice;
```

- [ ] **Step 4: Run the slice test**

Run: `CI=true npx react-scripts test --watchAll=false src/store/slices/publicStatsSlice.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing StatStrip test**

```tsx
// src/components/home/parts/StatStrip.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StatStrip from "./StatStrip";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

let stats: any = { data: undefined };
jest.mock("../../../store/slices/publicStatsSlice", () => ({
  useGetPublicStatsQuery: () => stats,
}));

// Reduced motion makes useCountUp return its target synchronously.
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: (query: string) => ({ matches: query.includes("reduce"), media: query,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
});

it("shows the four curated stats when the endpoint has not answered", () => {
  stats = { data: undefined };
  render(<StatStrip />);
  expect(screen.getAllByTestId("stat-item")).toHaveLength(4);
});

it("puts the learner count first when the endpoint returns one", () => {
  stats = { data: { learners: 12000, languages: 137, countries: 41, generatedAt: "" } };
  render(<StatStrip />);
  const items = screen.getAllByTestId("stat-item");
  expect(items).toHaveLength(5);
  expect(items[0].textContent).toContain("12,000");
  expect(items[0].textContent).toContain("learners");
});

it("hides the learner stat when the backend says null (under 1,000)", () => {
  stats = { data: { learners: null, languages: 137, countries: 3, generatedAt: "" } };
  render(<StatStrip />);
  expect(screen.getAllByTestId("stat-item")).toHaveLength(4);
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/home/parts/StatStrip.test.tsx`
Expected: FAIL — second case gets 4 items.

- [ ] **Step 7: Update `StatStrip.tsx`**

Replace the file's body from the `STATS` constant down with:

```tsx
import { useGetPublicStatsQuery } from "../../../store/slices/publicStatsSlice";

// Every figure here is checkable. The learner count comes from
// GET /api/v1/public/stats (rounded down, null under 1,000) and is prepended
// when present; the four below stay curated because they cannot be computed.
// "18 app languages" -- src/utils/locales/ holds 18 JSON files and
// `SUPPORTED_LANGUAGES` in src/utils/i18n.ts lists 18 codes.
const CURATED_STATS = [
  { value: "137", label: "languages" },
  { value: "18", label: "app languages" },
  { value: "24/7", label: "AI tutor" },
  { value: "Free", label: "forever tier" },
];

/** Numeric stats tick up when the strip scrolls into view; the rest are literal. */
const StatValue: React.FC<{ value: string; start: boolean }> = ({ value, start }) => {
  const numeric = /^\d+$/.test(value) ? Number(value) : null;
  const counted = useCountUp(numeric ?? 0, { start: start && numeric !== null });
  return (
    <p className="text-2xl font-extrabold text-brand-dark dark:text-brand-light">
      {numeric === null ? value : counted.toLocaleString("en-US")}
    </p>
  );
};

const StatStrip: React.FC = () => {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLElement>();
  // `!data` and never `isLoading`: on the server the hook is uninitialised.
  const { data } = useGetPublicStatsQuery();
  const learners = data && typeof data.learners === "number" ? data.learners : null;
  const stats =
    learners === null
      ? CURATED_STATS
      : [{ value: String(learners), label: "learners" }, ...CURATED_STATS];

  return (
    <section
      ref={ref}
      data-testid="stat-strip"
      className="border-y border-gray-100 bg-surface py-8 dark:border-gray-700 dark:bg-cardbg-dark"
    >
      <div
        className={`mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 ${
          stats.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4"
        }`}
      >
        {stats.map((s, i) => (
          <Reveal key={s.label} delayMs={i * 90}>
            <div data-testid="stat-item" className="text-center">
              <StatValue value={s.value} start={inView} />
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {t(`home.stats.${s.label}`) || s.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default StatStrip;
```

Keep the existing imports at the top of the file (`React`, `useTranslation`, `Reveal`, `useInView`, `useCountUp`) and add the `useGetPublicStatsQuery` import with them.

- [ ] **Step 8: Mock the hook in the two existing tests that render StatStrip without a store**

Add to both `src/components/home/parts/staticSections.test.tsx` and `src/components/home/HomeMain.test.tsx`, next to their existing `jest.mock` calls (adjust the relative path: `../../../store/...` from `parts/`, `../../store/...` from `home/`):

```ts
jest.mock("<relative>/store/slices/publicStatsSlice", () => ({
  useGetPublicStatsQuery: () => ({ data: undefined }),
}));
```

- [ ] **Step 9: Run the home tests**

Run: `CI=true npx react-scripts test --watchAll=false src/components/home`
Expected: PASS, including `shows exactly the four verifiable stats` (still 4 with no data).

- [ ] **Step 10: Commit**

```bash
git add src/constants.ts src/store/slices/publicStatsSlice.ts src/store/slices/publicStatsSlice.test.ts src/components/home/parts/StatStrip.tsx src/components/home/parts/StatStrip.test.tsx src/components/home/parts/staticSections.test.tsx src/components/home/HomeMain.test.tsx
git commit -m "feat(home): learner count from the public stats endpoint, curated stats as fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: The static-render harness (`publicRoutes.ts`, `renderRoute.tsx`)

**Files:**
- Create: `src/seo/publicRoutes.ts`
- Create: `src/prerender/renderRoute.tsx`
- Test: `src/prerender/renderRoute.test.tsx`

**Interfaces:**
- `publicRoutes.ts` produces `export const PUBLIC_ROUTES: string[]` (every non-dynamic `SEO_PAGES` path plus `"/404"`; `/communities` is **not** here in Phase A because `MainCommunity` redirects logged-out visitors — Phase B adds the public view and the route) and `export const PREFETCH: Record<string, PrefetchKey[]>` with `export type PrefetchKey = "stats" | "plans"`. Today only `"/"` prefetches (`["stats", "plans"]`).
- `renderRoute.tsx` produces:
  ```ts
  export interface RenderedRoute { path: string; html: string; head: string; }
  export interface RenderOptions { prefetch?: boolean; timeoutMs?: number; warn?: (message: string) => void; createRequest?: (url: string) => Request; }
  export function assertNoBrowserGlobals(): void;   // throws if window/document/navigator/localStorage/sessionStorage/matchMedia is defined
  export async function renderRoute(path: string, opts?: RenderOptions): Promise<RenderedRoute>;
  ```
  `renderRoute` throws (never falls back) on: a browser global being present, the static handler returning a redirect/Response, a thrown render error, or an `<h1>` count other than exactly 1. Data-fetch failure only calls `warn`.
- Consumed by: `scripts/prerender.js` (Task 13) and the test here. Contains **no** file I/O so it type-checks inside `src/` and runs under Jest.

- [ ] **Step 1: Write `src/seo/publicRoutes.ts`**

```ts
import { SEO_PAGES } from "./pages";

export type PrefetchKey = "stats" | "plans";

/**
 * Paths the build renders to static HTML: every indexed, non-dynamic route,
 * plus /404 (matches the catch-all; written to build/404.html).
 *
 * /communities is deliberately absent in Phase A: MainCommunity <Navigate>s
 * logged-out visitors to /login, which a static render cannot follow. Phase B
 * adds PublicCommunities and lists it here.
 */
export const PUBLIC_ROUTES: string[] = SEO_PAGES
  .map((p) => p.path)
  .filter((p) => p.indexOf(":") === -1)
  .concat("/404");

/** Data each path needs in the store before renderToString (see renderRoute). */
export const PREFETCH: Record<string, PrefetchKey[]> = {
  "/": ["stats", "plans"],
};
```

- [ ] **Step 2: Write the failing harness test**

```tsx
// src/prerender/renderRoute.test.tsx
/**
 * @jest-environment node
 */
// The same harness the build script uses, in the same kind of environment:
// no window, no document. Anything that reads a browser global while
// rendering a public route fails here first.
import { renderRoute, assertNoBrowserGlobals } from "./renderRoute";
import { PUBLIC_ROUTES } from "../seo/publicRoutes";

// Jest 27's node environment has no Request; the static handler only needs
// url, method and an abort signal for a loader-less GET.
const createRequest = (url: string) =>
  (typeof Request === "undefined"
    ? ({ url, method: "GET", headers: new Map(), signal: new AbortController().signal } as unknown as Request)
    : new Request(url));

beforeAll(() => {
  for (const k of ["navigator", "localStorage", "sessionStorage"]) delete (globalThis as any)[k];
});

it("the environment has no browser globals", () => {
  expect(() => assertNoBrowserGlobals()).not.toThrow();
});

describe.each(PUBLIC_ROUTES)("%s", (path) => {
  it("renders exactly one h1, a helmet title and description, and one canonical", async () => {
    const warn = jest.fn();
    const { html, head } = await renderRoute(path, { prefetch: false, createRequest, warn });
    expect(html.length).toBeGreaterThan(200);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(head).toMatch(/<title data-rh="true">[^<]+<\/title>/);
    if (path === "/404") {
      expect(head).toContain("noindex, nofollow");
      expect(head).not.toContain('rel="canonical"');
    } else {
      expect(head).toMatch(/name="description" content="[^"]+"/);
      expect(head.match(/rel="canonical"/g)).toHaveLength(1);
      expect(head).toContain("index, follow");
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

it("refuses a route without an h1", async () => {
  await expect(renderRoute("/login", { prefetch: false, createRequest })).rejects.toThrow(/h1/);
});
```

(`/login` has no `<h1>`; if it does by the time this runs, pick another app-only route such as `/register` and verify with `grep -c "<h1" src/components/auth/*.tsx`.)

- [ ] **Step 3: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/prerender/renderRoute.test.tsx`
Expected: FAIL — `Cannot find module './renderRoute'`.

- [ ] **Step 4: Write `src/prerender/renderRoute.tsx`**

```tsx
import React from "react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { HelmetProvider, FilledContext } from "react-helmet-async";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom/server";
import { routes } from "../router/routes";
import { createAppStore, AppStore } from "../store";
import i18n from "../utils/i18n";
import { plansApiSlice } from "../store/slices/plansSlice";
import { publicStatsApiSlice } from "../store/slices/publicStatsSlice";
import { SITE_ORIGIN } from "../seo/pages";
import { PREFETCH, PrefetchKey } from "../seo/publicRoutes";

export interface RenderedRoute {
  path: string;
  html: string;
  head: string;
}

export interface RenderOptions {
  /** Dispatch the route's PREFETCH queries and await them before rendering. */
  prefetch?: boolean;
  /** Per-query budget; a slow API must not stall the build. */
  timeoutMs?: number;
  /** Data-fetch failures are reported here and the page renders its fallback. */
  warn?: (message: string) => void;
  /** Test seam: Jest's node environment lacks a global Request. */
  createRequest?: (url: string) => Request;
}

const BROWSER_GLOBALS = ["window", "document", "navigator", "localStorage", "sessionStorage", "matchMedia"];

/**
 * The renderer relies on these being *absent* so that a render-time read is a
 * ReferenceError with a stack trace. (A throwing getter would also break
 * `typeof window === "undefined"` guards; absence does not.)
 */
export function assertNoBrowserGlobals(): void {
  for (const name of BROWSER_GLOBALS) {
    if (typeof (globalThis as any)[name] !== "undefined") {
      throw new Error(
        `prerender: global "${name}" is defined. Delete it before importing the app (scripts/register.js does this).`
      );
    }
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T | { error: { status: string; label: string } }> {
  return Promise.race<T | { error: { status: string; label: string } }>([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ error: { status: "TIMEOUT", label } }), ms)),
  ]);
}

async function prefetchFor(path: string, store: AppStore, timeoutMs: number, warn: (m: string) => void): Promise<void> {
  const keys: PrefetchKey[] = PREFETCH[path] || [];
  await Promise.all(
    keys.map(async (key) => {
      const thunk =
        key === "stats"
          ? publicStatsApiSlice.endpoints.getPublicStats.initiate()
          : plansApiSlice.endpoints.getVipPlans.initiate("ios");
      const result: any = await withTimeout(store.dispatch(thunk as any), timeoutMs, key);
      if (result && result.error) {
        warn(`prerender ${path}: prefetch "${key}" failed (${JSON.stringify(result.error).slice(0, 200)}); rendering fallback`);
      }
    })
  );
}

/** Render one public route to markup + head. Throws on anything that would ship an empty or wrong page. */
export async function renderRoute(path: string, opts: RenderOptions = {}): Promise<RenderedRoute> {
  const {
    prefetch = false,
    timeoutMs = 5000,
    warn = (m: string) => console.warn(m),
    createRequest = (url: string) => new Request(url),
  } = opts;

  assertNoBrowserGlobals();
  await i18n.changeLanguage("en");

  const store = createAppStore();
  if (prefetch) await prefetchFor(path, store, timeoutMs, warn);

  const handler = createStaticHandler(routes);
  const context = await handler.query(createRequest(SITE_ORIGIN + path));
  if (!("statusCode" in context)) {
    throw new Error(`prerender ${path}: static handler returned a Response (redirect?) instead of a render context`);
  }
  const router = createStaticRouter(routes, context);
  const helmetContext = {} as FilledContext;

  let html: string;
  try {
    html = renderToString(
      <HelmetProvider context={helmetContext}>
        <Provider store={store}>
          <StaticRouterProvider router={router} context={context} hydrate={false} />
        </Provider>
      </HelmetProvider>
    );
  } catch (err) {
    const e = err as Error;
    e.message = `prerender ${path}: ${e.message}`;
    throw e;
  }

  const h1Count = (html.match(/<h1[\s>]/g) || []).length;
  if (h1Count !== 1) {
    throw new Error(`prerender ${path}: expected exactly one <h1>, found ${h1Count}`);
  }

  const { helmet } = helmetContext;
  const head = [helmet.title.toString(), helmet.meta.toString(), helmet.link.toString(), helmet.script.toString()]
    .filter(Boolean)
    .join("\n");

  return { path, html, head };
}
```

`hydrate={false}` matters: the default appends a `<script>window.__staticRouterHydrationData=…</script>` into the markup that the client's `RouterProvider` never renders — a guaranteed hydration mismatch.

- [ ] **Step 5: Run the harness test**

Run: `CI=true npx react-scripts test --watchAll=false src/prerender/renderRoute.test.tsx`
Expected: PASS for all eight paths (`/`, `/download`, `/moments`, `/privacy-policy`, `/terms-of-use`, `/support`, `/data-deletion`, `/404`) and the `/login` rejection.

Failure triage — each of these is a real defect the harness exists to catch; fix the component, not the test:
- `ReferenceError: X is not defined` — a component reads a browser global in render. Move the read into `useEffect`/`useState` initial value → effect (pattern from Task 3).
- `expected exactly one <h1>, found 0/2` — a page without a heading, or two components each rendering one. Demote the extra to `h2`.
- `Cannot find module 'react-router-dom/server'` under Jest — cannot happen with 6.23.1 (`node_modules/react-router-dom/server.js` exists); if it does, the install is broken: `npm ci`.
- A module fails to load because it is ESM-only — wrap that page's `element` in `React.lazy(() => import(...))` inside `routes.tsx` (it is never rendered for public paths, so it is never loaded) and note it in the commit; this is the direction Phase B takes anyway.

- [ ] **Step 6: Run the full suite**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/seo/publicRoutes.ts src/prerender/renderRoute.tsx src/prerender/renderRoute.test.tsx
git commit -m "feat(prerender): static-render harness over the shared route tree with loud failure

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: The build step — template injection, sitemap, `scripts/register.js`, `scripts/prerender.js`

**Files:**
- Create: `src/prerender/template.ts`, `src/prerender/sitemap.ts`
- Create: `scripts/register.js`, `scripts/prerender.js`
- Modify: `package.json` (`scripts.build`, `scripts.prerender`, devDependency `@babel/register`)
- Delete: `public/sitemap.xml`
- Test: `src/prerender/template.test.ts`, `src/prerender/sitemap.test.ts`

**Interfaces:**
- `template.ts`: `export function injectIntoTemplate(template: string, page: { html: string; head: string }): string`. Replaces `<div id=root></div>` / `<div id="root"></div>` (CRA minifies attribute quotes away) with `<div id="root">${html}</div>`; removes the static `<title>`, `meta[name=description]`, `link[rel=canonical]`, `meta[name=robots]`, `meta[name=googlebot]`, every `meta[property^=og:]` and `meta[name^=twitter:]`; inserts `head` immediately before `</head>`. Throws if the root div is not found.
- `sitemap.ts`: `export function buildSitemap(paths: string[], lastmod: string): string` — `urlset` with one `<url><loc>https://banatalk.com{path}</loc><lastmod>{lastmod}</lastmod></url>` per path, `/404` excluded, no `<priority>`.
- `scripts/register.js` (CommonJS, required via `node -r`): deletes `navigator`/`localStorage`/`sessionStorage`; sets `NODE_ENV=production`; loads CRA's env files via `react-scripts/config/env`; installs `@babel/register` for `.ts .tsx .js .jsx` with `babel-preset-react-app`; stubs `.css .scss .sass` to `{}`; maps image imports to the hashed file in `build/static/media/` so `<img src>` matches what the client bundle renders (else hydration would keep the server's wrong `src`).
- `scripts/prerender.js`: for each `PUBLIC_ROUTES` path → `renderRoute(path, { prefetch: true })` → `injectIntoTemplate` → write `build/index.html` (`/`), `build/404.html` (`/404`), else `build/<path>/index.html`; then `build/sitemap.xml`. Exits `1` with the route name on any error; warnings are printed but not fatal; `process.exit(0)` at the end so a lingering fetch cannot hold the build open.
- `package.json`: `"build": "react-scripts build && node -r ./scripts/register.js scripts/prerender.js"`, `"prerender": "node -r ./scripts/register.js scripts/prerender.js"`. `npm run deploy` already calls `npm run build`, so deploys pick this up unchanged.

- [ ] **Step 1: Write the failing pure-function tests**

```ts
// src/prerender/template.test.ts
import { injectIntoTemplate } from "./template";

// CRA's minifier drops attribute quotes where it can, so the template is
// closer to `<div id=root>` than to what public/index.html shows.
const template = [
  "<!doctype html><html lang=en><head><meta charset=utf-8>",
  '<meta name=description content="Static description">',
  '<meta name=robots content="index, follow">',
  '<link rel=canonical href="https://banatalk.com">',
  '<meta property="og:title" content="Static OG">',
  '<meta property=og:url content="https://banatalk.com">',
  '<meta name="twitter:card" content="summary">',
  "<script type=application/ld+json>{\"@type\":\"WebSite\"}</script>",
  "<title>Static title</title></head>",
  '<body><noscript>JS</noscript><div id=root></div><script src=/static/js/main.js></script></body></html>',
].join("");

const page = { html: "<h1>Hello</h1>", head: '<title data-rh="true">Page title</title>\n<meta data-rh="true" name="description" content="Page description"/>' };

it("puts the markup inside #root and the helmet head before </head>", () => {
  const out = injectIntoTemplate(template, page);
  expect(out).toContain('<div id="root"><h1>Hello</h1></div>');
  expect(out).toContain('<title data-rh="true">Page title</title>');
  expect(out.indexOf("Page description")).toBeLessThan(out.indexOf("</head>"));
});

it("removes the static tags helmet supersedes and keeps the rest", () => {
  const out = injectIntoTemplate(template, page);
  expect(out).not.toContain("Static title");
  expect(out).not.toContain("Static description");
  expect(out).not.toContain("Static OG");
  expect(out).not.toMatch(/property=og:url/);
  expect(out).not.toContain('name="twitter:card" content="summary"');
  expect(out).not.toContain("rel=canonical");
  expect(out).not.toMatch(/name=robots/);
  expect(out).toContain('"@type":"WebSite"');   // site-wide JSON-LD stays
  expect(out).toContain("<noscript>JS</noscript>");
  expect(out).toContain("/static/js/main.js");
});

it("also handles the quoted form of the root div", () => {
  expect(injectIntoTemplate('<html><head></head><body><div id="root"></div></body></html>', page))
    .toContain('<div id="root"><h1>Hello</h1></div>');
});

it("refuses a template without a root div", () => {
  expect(() => injectIntoTemplate("<html><head></head><body></body></html>", page)).toThrow(/#root/);
});
```

```ts
// src/prerender/sitemap.test.ts
import { buildSitemap } from "./sitemap";
import { PUBLIC_ROUTES } from "../seo/publicRoutes";

it("lists every public route except /404 with the build date and no priorities", () => {
  const xml = buildSitemap(PUBLIC_ROUTES, "2026-09-22");
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  expect(locs).toEqual(PUBLIC_ROUTES.filter((p) => p !== "/404").map((p) => `https://banatalk.com${p}`));
  expect(xml).toContain("<lastmod>2026-09-22</lastmod>");
  expect(xml).not.toContain("<priority>");
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/prerender/template.test.ts src/prerender/sitemap.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/prerender/template.ts` and `src/prerender/sitemap.ts`**

```ts
// src/prerender/template.ts
/**
 * Fold a rendered route into CRA's built index.html. The static head tags
 * that PageMeta now owns are removed so a page never carries two titles or
 * two canonicals; everything else (icons, manifest, site-wide JSON-LD, the
 * script tags) is left exactly as webpack wrote it.
 */
const ROOT_DIV = /<div id=(?:"root"|root)><\/div>/;
const SUPERSEDED: RegExp[] = [
  /<title>[^<]*<\/title>/,
  /<meta name=(?:"description"|description)\s[^>]*>/g,
  /<meta name=(?:"robots"|robots)\s[^>]*>/g,
  /<meta name=(?:"googlebot"|googlebot)\s[^>]*>/g,
  /<link rel=(?:"canonical"|canonical)\s[^>]*>/g,
  // The minifier drops quotes where it can, so "og:url" may appear bare.
  /<meta property=(?:"og:[^"]*"|og:[^\s>]+)[^>]*>/g,
  /<meta name=(?:"twitter:[^"]*"|twitter:[^\s>]+)[^>]*>/g,
];

export function injectIntoTemplate(template: string, page: { html: string; head: string }): string {
  if (!ROOT_DIV.test(template)) {
    throw new Error("prerender: template has no empty #root div to fill");
  }
  let out = template;
  for (const re of SUPERSEDED) out = out.replace(re, "");
  out = out.replace("</head>", `${page.head}\n</head>`);
  out = out.replace(ROOT_DIV, `<div id="root">${page.html}</div>`);
  return out;
}
```

```ts
// src/prerender/sitemap.ts
import { SITE_ORIGIN } from "../seo/pages";

/** Google ignores <priority>; lastmod is the build date because the build is when the copy last changed. */
export function buildSitemap(paths: string[], lastmod: string): string {
  const urls = paths
    .filter((p) => p !== "/404")
    .map((p) => `  <url>\n    <loc>${SITE_ORIGIN}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
```

`String.prototype.matchAll` in the sitemap test needs `lib: esnext` — already in `tsconfig.json`.

- [ ] **Step 4: Run the pure-function tests**

Run: `CI=true npx react-scripts test --watchAll=false src/prerender/template.test.ts src/prerender/sitemap.test.ts`
Expected: PASS.

- [ ] **Step 5: Install `@babel/register`**

Run: `npm install --save-dev @babel/register@^7.25.9`
Expected: `package.json` devDependencies gain `@babel/register`. `babel-preset-react-app@10.0.1` and `@babel/core` are already present through `react-scripts`.

- [ ] **Step 6: Write `scripts/register.js`**

```js
/**
 * Node require hooks for the prerender step. Loaded with `node -r`.
 *
 * Order matters: the browser-ish globals are deleted before any app module is
 * required, so a render-time read is a ReferenceError that names the route.
 */
"use strict";

// Node 21+ defines navigator; Node 22+ defines localStorage/sessionStorage.
// The app treats their *absence* as "server"; their presence with no backing
// store would make guards pass and then explode inside. Remove them.
for (const key of ["navigator", "localStorage", "sessionStorage"]) {
  delete globalThis[key];
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.BABEL_ENV = process.env.NODE_ENV;

// Same .env / .env.production resolution the webpack build uses, so
// REACT_APP_API_URL points the build-time prefetch at the real API.
require("react-scripts/config/env");

require("@babel/register")({
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
  babelrc: false,
  configFile: false,
  cache: false,
  ignore: [/node_modules/],
});

// Styles: the markup does not need them; the built CSS is linked by the template.
for (const ext of [".css", ".scss", ".sass"]) {
  require.extensions[ext] = (module) => {
    module.exports = {};
  };
}

// Images: resolve to the hashed file webpack emitted so <img src> in the
// prerendered HTML equals what the client renders (React keeps the server's
// attribute on hydration, so a mismatch would ship a broken image).
const fs = require("fs");
const path = require("path");
const mediaDir = path.resolve(__dirname, "../build/static/media");
const emitted = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const ext of [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"]) {
  require.extensions[ext] = (module, filename) => {
    const { name } = path.parse(filename);
    const re = new RegExp(`^${escapeRe(name)}\\.[0-9a-f]+${escapeRe(ext)}$`);
    const hit = emitted.find((f) => re.test(f));
    if (!hit) {
      console.warn(`[prerender] no emitted asset for ${path.relative(process.cwd(), filename)}; using an unhashed path`);
    }
    module.exports = `/static/media/${hit || name + ext}`;
  };
}
```

- [ ] **Step 7: Write `scripts/prerender.js`**

```js
#!/usr/bin/env node
/**
 * Render every public route to static HTML and write the sitemap.
 * Runs after `react-scripts build`:  node -r ./scripts/register.js scripts/prerender.js
 *
 * Fails the build (exit 1) on a thrown render, a page without exactly one
 * <h1>, or a browser-global read during render. Data-fetch failures are
 * warnings: the page renders its fallback content, which is still a complete
 * page. Overwrites build/index.html with the rendered homepage.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const { renderRoute } = require("../src/prerender/renderRoute");
const { injectIntoTemplate } = require("../src/prerender/template");
const { buildSitemap } = require("../src/prerender/sitemap");
const { PUBLIC_ROUTES } = require("../src/seo/publicRoutes");

const buildDir = path.resolve(__dirname, "../build");
const templatePath = path.join(buildDir, "index.html");

function outputFor(route) {
  if (route === "/") return templatePath;
  if (route === "/404") return path.join(buildDir, "404.html");
  return path.join(buildDir, route.replace(/^\//, ""), "index.html");
}

async function main() {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`prerender: ${templatePath} not found — run react-scripts build first`);
  }
  // Read once: "/" overwrites this file.
  const template = fs.readFileSync(templatePath, "utf8");
  const warnings = [];
  const warn = (m) => {
    warnings.push(m);
    console.warn(`[prerender] warning: ${m}`);
  };

  for (const route of PUBLIC_ROUTES) {
    const started = Date.now();
    const rendered = await renderRoute(route, { prefetch: true, warn });
    const out = outputFor(route);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, injectIntoTemplate(template, rendered));
    console.log(`[prerender] ${route} -> ${path.relative(buildDir, out)} (${Date.now() - started}ms)`);
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(buildDir, "sitemap.xml"), buildSitemap(PUBLIC_ROUTES, lastmod));
  console.log(`[prerender] sitemap.xml with ${PUBLIC_ROUTES.length - 1} urls, lastmod ${lastmod}`);

  if (warnings.length) console.warn(`[prerender] finished with ${warnings.length} warning(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[prerender] FAILED: ${err && err.stack ? err.stack : err}`);
    process.exit(1);
  });
```

- [ ] **Step 8: Wire `package.json` and remove the hand-written sitemap**

In `package.json` `scripts`:
- `"build": "react-scripts build && node -r ./scripts/register.js scripts/prerender.js",`
- add `"prerender": "node -r ./scripts/register.js scripts/prerender.js",`

Then: `git rm public/sitemap.xml` (the generated one wins; a stale copy in `public/` would be copied into `build/` and overwritten anyway, but deleting it removes the temptation to edit it). `public/robots.txt` already points at `/sitemap.xml`; leave it.

- [ ] **Step 9: Run the real build end to end**

Run: `GENERATE_SOURCEMAP=false npm run build 2>&1 | tail -30`
Expected: webpack's "Compiled successfully", then eight `[prerender] <route> -> …` lines and the sitemap line, exit code 0. Then verify:

```bash
ls build/index.html build/404.html build/download/index.html build/moments/index.html build/privacy-policy/index.html build/terms-of-use/index.html build/support/index.html build/data-deletion/index.html build/sitemap.xml
grep -c "<h1" build/index.html build/download/index.html          # 1 each
grep -o '<title data-rh="true">[^<]*' build/download/index.html    # Download BananaTalk for iPhone and Android
grep -c "<title>" build/index.html                                 # 0 — static title removed
grep -o 'rel="canonical" href="[^"]*"' build/support/index.html    # https://banatalk.com/support
grep -c hreflang build/index.html                                  # 0
grep -o '<img[^>]*src="[^"]*"' build/index.html | head -2          # src="/static/media/logo.<hash>.png"
grep -c "__staticRouterHydrationData" build/index.html             # 0
grep -o "<loc>[^<]*" build/sitemap.xml                             # 7 urls, no /404
```

If the prerender prints a prefetch warning because the API is unreachable from this machine, that is expected locally; the page still renders (fallback stats/plans). If it exits 1, the message names the route and the reason — fix the component (see Task 12 triage) and rebuild.

If `[prerender] no emitted asset for src/assets/logo.png` appears, CRA emitted the file under a different naming scheme: `ls build/static/media/` and adjust the regex in `register.js` to match (the name and extension are stable; only the hash format could differ).

- [ ] **Step 10: Run the whole test suite once more**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json scripts/register.js scripts/prerender.js src/prerender/template.ts src/prerender/template.test.ts src/prerender/sitemap.ts src/prerender/sitemap.test.ts
# public/sitemap.xml's deletion was staged by `git rm` in Step 8
git commit -m "feat(build): prerender public routes to static HTML and generate the sitemap

npm run build now renders PUBLIC_ROUTES into build/<path>/index.html (and
build/404.html) through the shared route tree, injects per-route head tags,
and writes build/sitemap.xml with the build date. The hand-written
public/sitemap.xml is gone.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Hydrate the prerendered markup

**Files:**
- Create: `src/bootstrap/chooseRenderer.ts`
- Modify: `src/index.tsx`
- Test: `src/bootstrap/chooseRenderer.test.ts`

**Interfaces:**
- `export function chooseRenderer(container: { childElementCount: number } | null): "hydrate" | "create"` — `"hydrate"` when the container has element children (a prerendered page), else `"create"` (the SPA shell for non-prerendered routes).
- `index.tsx` calls `hydrateRoot(container, app, { onRecoverableError })` or `createRoot(container).render(app)` accordingly. A recoverable hydration error (e.g. a logged-in user's navbar differing from the logged-out prerender) makes React re-render client-side — the page works; in development it is logged so it can be fixed.

- [ ] **Step 1: Write the failing test**

```ts
// src/bootstrap/chooseRenderer.test.ts
import { chooseRenderer } from "./chooseRenderer";

it("hydrates when the root already has prerendered children", () => {
  const root = document.createElement("div");
  root.innerHTML = "<h1>Hi</h1>";
  expect(chooseRenderer(root)).toBe("hydrate");
});

it("creates a fresh root for the empty SPA shell", () => {
  expect(chooseRenderer(document.createElement("div"))).toBe("create");
  expect(chooseRenderer(null)).toBe("create");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/bootstrap/chooseRenderer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/bootstrap/chooseRenderer.ts`**

```ts
/**
 * Prerendered routes arrive with markup inside #root and must be hydrated;
 * everything else gets the empty shell from nginx's SPA fallback and must be
 * rendered from scratch. Deciding by "does #root have children" is the whole
 * heuristic, kept in one place so it can be tested.
 */
export function chooseRenderer(container: { childElementCount: number } | null): "hydrate" | "create" {
  return container && container.childElementCount > 0 ? "hydrate" : "create";
}
```

- [ ] **Step 4: Update `src/index.tsx`**

Replace from `const root = createRoot(...)` to the end with:

```tsx
import { createRoot, hydrateRoot } from "react-dom/client";   // replace the existing createRoot import
import { chooseRenderer } from "./bootstrap/chooseRenderer";

const container = document.getElementById("root") as HTMLElement;

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={rootReducer}>
        <RouterProvider router={router} />
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);

if (chooseRenderer(container) === "hydrate") {
  hydrateRoot(container, app, {
    onRecoverableError: (error) => {
      // React already recovered by re-rendering on the client. Surface it in
      // development so the differing component gets fixed (spec §11: move its
      // browser-dependent output into an effect; never suppressHydrationWarning).
      if (process.env.NODE_ENV !== "production") {
        console.warn("[hydrate] recovered from a mismatch:", error);
      }
    },
  });
} else {
  createRoot(container).render(app);
}
```

(Keep the existing CSS imports and the `router`/`rootReducer` imports above.)

- [ ] **Step 5: Run the test and the build, then check hydration in a browser**

Run: `CI=true npx react-scripts test --watchAll=false src/bootstrap && npm run build 2>&1 | tail -3 && npx serve -s build -l 5050`

Production React is silent about hydration mismatches, so for this one check add a temporary `console.log("[hydrate] mismatch", error)` as the first line of the `onRecoverableError` callback, rebuild, and remove it before committing. Then open `http://localhost:5050/` and `http://localhost:5050/download` with the console open.
Expected: the page appears instantly from static HTML, then becomes interactive (language switcher works; the pricing section shows live prices if the API is reachable); view-source shows `<h1>` and the per-route `<title>`; the console shows **no** `[hydrate] mismatch` line while logged out. A mismatch line names the differing component — move its browser-dependent output into an effect (spec §11), never `suppressHydrationWarning`. Stop `serve` with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/bootstrap/chooseRenderer.ts src/bootstrap/chooseRenderer.test.ts src/index.tsx
git commit -m "feat(bootstrap): hydrate prerendered pages, create the root for the SPA shell

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Footer links, the nginx snippet, and the README

**Files:**
- Modify: `src/components/footer/FooterMain.tsx:50-53`
- Create: `deploy/nginx.snippet.conf`
- Create: `README.md`
- Test: `src/components/footer/FooterMain.test.tsx` (new), `src/deploySnippet.test.ts` (new)

**Interfaces:**
- Footer "Quick Links" become: Home `/`, Communities `/communities`, Download the app `/download`, Support `/support`, Pricing `/#pricing` (the homepage section, `HomeMain.tsx:35` has `id="pricing"`). `/contact` is gone (nginx 410s it). Keys: `footer.links.home` (exists), `footer.links.communities`, `footer.links.download`, `footer.links.support`, `footer.links.pricing` (exists). Phase B adds `/meet` and `/learn-korean` here.
- `deploy/nginx.snippet.conf` is applied by hand on the server (the live config is not in this repo). It is versioned so the 301/410 list has one source of truth; the test pins that every 410 path is not a real route and every 301 target is.

- [ ] **Step 1: Write the failing footer test**

```tsx
// src/components/footer/FooterMain.test.tsx
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { MemoryRouter, matchRoutes } from "react-router-dom";
import FooterMain from "./FooterMain";
import { routes } from "../../router/routes";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// Every prerendered page carries the footer, so a footer link to a dead
// route is a sitewide link to a 410. Each internal href must resolve to a
// real route in the tree (hash fragments point at a section of that route).
it("every internal footer link matches a route", () => {
  const { container } = render(<MemoryRouter><FooterMain /></MemoryRouter>);
  const hrefs = Array.from(container.querySelectorAll("a[href^='/']")).map((a) => a.getAttribute("href")!);
  expect(hrefs.length).toBeGreaterThan(4);
  hrefs.forEach((href) => {
    const pathname = href.split("#")[0] || "/";
    const matches = matchRoutes(routes, pathname) || [];
    const leaf = matches[matches.length - 1];
    expect({ href, matched: leaf && leaf.route.path }).not.toEqual({ href, matched: "*" });
    expect(leaf).toBeDefined();
  });
});

it("links the download page, communities and support", () => {
  const { container } = render(<MemoryRouter><FooterMain /></MemoryRouter>);
  const hrefs = Array.from(container.querySelectorAll("a[href^='/']")).map((a) => a.getAttribute("href"));
  expect(hrefs).toEqual(expect.arrayContaining(["/download", "/communities", "/support", "/#pricing"]));
  expect(hrefs).not.toContain("/contact");
  expect(hrefs).not.toContain("/pricing");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/footer`
Expected: FAIL — `/pricing` and `/contact` match only `*`.

- [ ] **Step 3: Edit the footer**

In `src/components/footer/FooterMain.tsx` replace lines 50-53 with:

```tsx
                <li><Link to="/">{t("footer.links.home")}</Link></li>
                <li><Link to="/communities">{t("footer.links.communities") || "Communities"}</Link></li>
                <li><Link to="/download">{t("footer.links.download") || "Download the app"}</Link></li>
                <li><Link to="/support">{t("footer.links.support") || "Support"}</Link></li>
                <li><Link to="/#pricing">{t("footer.links.pricing")}</Link></li>
```

- [ ] **Step 4: Run the footer test**

Run: `CI=true npx react-scripts test --watchAll=false src/components/footer`
Expected: PASS.

- [ ] **Step 5: Write the failing snippet test**

```ts
// src/deploySnippet.test.ts
/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { matchRoutes } from "react-router-dom";
import { routes } from "./router/routes";

const snippet = fs.readFileSync(path.resolve(__dirname, "..", "deploy", "nginx.snippet.conf"), "utf8");
const leafPath = (p: string) => {
  const m = matchRoutes(routes, p) || [];
  return m.length ? m[m.length - 1].route.path : undefined;
};

it("every 410 path is not a real route", () => {
  const gone = Array.from(snippet.matchAll(/location = (\/[\w-]+) \{ return 410; \}/g)).map((m) => m[1]);
  expect(gone).toHaveLength(16);
  gone.forEach((p) => expect(leafPath(p)).toBe("*"));
});

it("every 301 target is a real route", () => {
  const redirects = Array.from(snippet.matchAll(/location = (\/[\w-]+) \{ return 301 (\/[\w#-]*); \}/g));
  expect(redirects.map((m) => m[1]).sort()).toEqual(["/language-exchange", "/pen-pals", "/privacy", "/terms"]);
  redirects.forEach((m) => expect(leafPath(m[2].split("#")[0] || "/")).not.toBe("*"));
});

it("serves the prerendered 404 and keeps the SPA fallback", () => {
  expect(snippet).toContain("error_page 404 /404.html;");
  expect(snippet).toContain("location = /404.html { internal; }");
  expect(snippet).toContain("try_files $uri $uri/ /index.html;");
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/deploySnippet.test.ts`
Expected: FAIL — `ENOENT deploy/nginx.snippet.conf`.

- [ ] **Step 7: Write `deploy/nginx.snippet.conf`**

`/pen-pals` redirects to `/` in Phase A (its real target `/meet` does not exist yet); Phase B changes that one line to `/meet`.

```nginx
# BananaTalk web — nginx additions for the prerendered build.
#
# Paste the contents of this file inside the `server { ... }` block that
# serves the `build/` folder (root /path/to/language_exchange_web_front/build).
# After editing the live config:  sudo nginx -t && sudo nginx -s reload
#
# What this does:
#   1. Real 404s get the prerendered build/404.html (status stays 404).
#   2. Old sitemap URLs with an obvious successor are 301s.
#   3. Old sitemap URLs with no successor answer 410 Gone so search engines
#      drop them instead of indexing an empty shell.
#   4. Prerendered folders are served directly ($uri/ finds build/<path>/index.html);
#      every other route falls back to the SPA shell.

error_page 404 /404.html;
location = /404.html { internal; }

# 2. Redirects — dead URL -> successor
location = /privacy { return 301 /privacy-policy; }
location = /terms { return 301 /terms-of-use; }
location = /pen-pals { return 301 /; }
location = /language-exchange { return 301 /; }

# 3. Gone — sixteen URLs the old sitemap promised that never existed
location = /about { return 410; }
location = /features { return 410; }
location = /languages { return 410; }
location = /help { return 410; }
location = /faq { return 410; }
location = /blog { return 410; }
location = /success-stories { return 410; }
location = /learn-english { return 410; }
location = /learn-spanish { return 410; }
location = /learn-japanese { return 410; }
location = /learn-chinese { return 410; }
location = /learn-french { return 410; }
location = /learn-german { return 410; }
location = /video-call { return 410; }
location = /cultural-dating { return 410; }
location = /international-dating { return 410; }

# 4. Static first, prerendered folders second, SPA shell last
location / {
    try_files $uri $uri/ /index.html;
}
```

- [ ] **Step 8: Run the snippet test**

Run: `CI=true npx react-scripts test --watchAll=false src/deploySnippet.test.ts`
Expected: PASS.

- [ ] **Step 9: Write `README.md`**

```markdown
# BananaTalk web (banatalk.com)

React 18 + CRA (`react-scripts` 5), TypeScript 3.7.2, RTK Query, react-i18next, Tailwind.

## Develop

    npm start                                   # dev server (SPA shell, no prerender)
    CI=true npx react-scripts test --watchAll=false

## Build

    npm run build

`react-scripts build` produces `build/`, then `scripts/prerender.js` (loaded through
`scripts/register.js`) renders every route in `src/seo/publicRoutes.ts` to static HTML —
`build/index.html`, `build/download/index.html`, …, `build/404.html` — and writes
`build/sitemap.xml`. The prerender **fails the build** if a page throws, has no single
`<h1>`, or reads `window`/`document`/`navigator`/storage during render. A backend that is
unreachable at build time is only a warning: pages render their fallback content.

Per-route `<head>` tags come from `src/seo/pages.ts` + `src/seo/PageMeta.tsx`. Add a page
there (and its `seo.*` copy in every `src/utils/locales/*.json` — use
`node scripts/merge-locales.js <additions.json>`) and it is prerendered and in the sitemap.

## Deploy

    npm run deploy

Runs the build under a 1GB Node heap on the server and reloads nginx, which serves `build/`.

nginx needs the additions in `deploy/nginx.snippet.conf` (prerendered 404 page, 301s for
old URLs, 410s for dead ones, SPA fallback). They are applied by hand: paste them into the
`server {}` block, then `sudo nginx -t && sudo nginx -s reload`. When the dead-URL list
changes, change the snippet **and** the live config together.

## Analytics

- GA4 loads only after the visitor accepts the consent bar; the measurement ID comes from
  `REACT_APP_GA_MEASUREMENT_ID` (unset = GA is a no-op).
- First-party events (`page_view`, `store_tap`, `cta_tap`) post to
  `POST /api/v1/analytics/events` regardless of consent — they carry a per-tab session id
  and no cookie.
```

- [ ] **Step 10: Run the suite and commit**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS.

```bash
git add src/components/footer/FooterMain.tsx src/components/footer/FooterMain.test.tsx deploy/nginx.snippet.conf src/deploySnippet.test.ts README.md
git commit -m "feat(deploy): nginx snippet for 404/301/410, README deploy notes, footer links to real routes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Consent storage and the GA4 loader

**Files:**
- Create: `src/analytics/consent.ts`, `src/analytics/ga.ts`
- Test: `src/analytics/consent.test.ts`, `src/analytics/ga.test.ts`

**Interfaces:**
- `consent.ts`: `export type Consent = "granted" | "denied"; export const CONSENT_KEY = "bt.consent"; export function readConsent(): Consent | undefined; export function writeConsent(value: Consent): void;` — both swallow storage errors (`undefined` = undecided).
- `ga.ts`: `export function getGaId(): string` (reads `process.env.REACT_APP_GA_MEASUREMENT_ID` at call time, `""` if unset); `export function loadGa(measurementId?: string): boolean` (injects the gtag script once; returns whether GA is loaded; no-op without an id or without `document`); `export function isGaLoaded(): boolean`; `export function gaEvent(name: string, params?: Record<string, unknown>): void` (no-op unless loaded; never throws); `export function __resetGaForTests(): void`.
- Consumed by: `ConsentBar` (Task 18), `usePageViews` (Task 17), `StoreLink` (Phase B).

- [ ] **Step 1: Write the failing tests**

```ts
// src/analytics/consent.test.ts
import { readConsent, writeConsent, CONSENT_KEY } from "./consent";

beforeEach(() => window.localStorage.clear());

it("is undecided by default", () => {
  expect(readConsent()).toBeUndefined();
});

it("round-trips granted and denied", () => {
  writeConsent("granted");
  expect(readConsent()).toBe("granted");
  writeConsent("denied");
  expect(readConsent()).toBe("denied");
  expect(window.localStorage.getItem(CONSENT_KEY)).toBe("denied");
});

it("treats garbage as undecided", () => {
  window.localStorage.setItem(CONSENT_KEY, "maybe");
  expect(readConsent()).toBeUndefined();
});

it("treats a throwing storage as undecided and does not throw on write", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readConsent()).toBeUndefined();
  expect(() => writeConsent("granted")).not.toThrow();
  spy.mockRestore(); set.mockRestore();
});
```

```ts
// src/analytics/ga.test.ts
import { loadGa, gaEvent, isGaLoaded, getGaId, __resetGaForTests } from "./ga";

const ORIGINAL_ENV = process.env.REACT_APP_GA_MEASUREMENT_ID;

beforeEach(() => {
  __resetGaForTests();
  document.head.innerHTML = "";
  delete (window as any).gtag;
  delete (window as any).dataLayer;
  process.env.REACT_APP_GA_MEASUREMENT_ID = "G-TEST123";
});
afterAll(() => { process.env.REACT_APP_GA_MEASUREMENT_ID = ORIGINAL_ENV; });

it("reads the id from the environment at call time", () => {
  expect(getGaId()).toBe("G-TEST123");
  delete process.env.REACT_APP_GA_MEASUREMENT_ID;
  expect(getGaId()).toBe("");
});

it("is a no-op without an id", () => {
  delete process.env.REACT_APP_GA_MEASUREMENT_ID;
  expect(loadGa()).toBe(false);
  expect(document.querySelector("script[data-testid='ga-script']")).toBeNull();
});

it("injects gtag once, with anonymize_ip, and then forwards events", () => {
  expect(loadGa()).toBe(true);
  expect(loadGa()).toBe(true);
  const scripts = document.querySelectorAll("script[data-testid='ga-script']");
  expect(scripts).toHaveLength(1);
  expect(scripts[0].getAttribute("src")).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST123");
  const layer = (window as any).dataLayer as IArguments[];
  expect(Array.from(layer[1])).toEqual(["config", "G-TEST123", { anonymize_ip: true }]);
  gaEvent("store_tap", { placement: "hero" });
  expect(Array.from(layer[layer.length - 1])).toEqual(["event", "store_tap", { placement: "hero" }]);
  expect(isGaLoaded()).toBe(true);
});

it("gaEvent before loadGa sends nothing and never throws", () => {
  expect(() => gaEvent("page_view", { page_path: "/" })).not.toThrow();
  expect((window as any).dataLayer).toBeUndefined();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/analytics`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/analytics/consent.ts`**

```ts
export type Consent = "granted" | "denied";
export const CONSENT_KEY = "bt.consent";

/** Undecided (undefined) means no GA. Storage failures are undecided too, so the bar shows. */
export function readConsent(): Consent | undefined {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function writeConsent(value: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private mode / blocked storage: the choice holds for this page view only.
  }
}
```

- [ ] **Step 4: Write `src/analytics/ga.ts`**

```ts
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

/** Read at call time so tests (and a missing .env) behave predictably. */
export function getGaId(): string {
  return process.env.REACT_APP_GA_MEASUREMENT_ID || "";
}

export function isGaLoaded(): boolean {
  return loaded;
}

/**
 * Inject gtag.js. Called only after consent (ConsentBar). Idempotent; a
 * missing id or a non-browser context makes it a no-op that returns false.
 */
export function loadGa(measurementId: string = getGaId()): boolean {
  if (loaded) return true;
  if (!measurementId || typeof document === "undefined") return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.setAttribute("data-testid", "ga-script");
  document.head.appendChild(script);

  loaded = true;
  return true;
}

/** Forward an event to GA if — and only if — it was loaded. Never throws. */
export function gaEvent(name: string, params: Record<string, unknown> = {}): void {
  try {
    if (!loaded || typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", name, params);
  } catch {
    // Analytics must never reach the user.
  }
}

export function __resetGaForTests(): void {
  loaded = false;
}
```

- [ ] **Step 5: Run the tests**

Run: `CI=true npx react-scripts test --watchAll=false src/analytics`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/consent.ts src/analytics/consent.test.ts src/analytics/ga.ts src/analytics/ga.test.ts
git commit -m "feat(analytics): consent storage and a consent-gated GA4 loader

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: First-party events — `track.ts` and `usePageViews`

**Files:**
- Modify: `src/constants.ts`
- Create: `src/analytics/track.ts`, `src/analytics/usePageViews.ts`
- Modify: `src/App.tsx`
- Test: `src/analytics/track.test.ts`, `src/analytics/usePageViews.test.tsx`

**Interfaces:**
- `constants.ts`: `export const ANALYTICS_EVENTS_URL = "/api/v1/analytics/events";`
- `track.ts`:
  ```ts
  export type EventName = "page_view" | "store_tap" | "cta_tap";
  export interface EventData { path?: string; placement?: string; }
  export interface EventPayload { name: EventName; path: string; placement?: string; platform: "ios" | "android" | "other"; referrer: string | null; language: string | null; sessionId: string; }
  export function getSessionId(): string;                       // per-tab, sessionStorage "bt.sid", random; not a user id
  export function buildPayload(name: EventName, data?: EventData): EventPayload;
  export function trackEvent(name: EventName, data?: EventData): void;   // fire-and-forget, one retry, never throws, nothing before document is ready
  ```
  Backend contract (Task 19): `POST ${BASE_URL}/api/v1/analytics/events` with that JSON body → `204`.
- `usePageViews.ts`: `export function usePageViews(): void` — on each `pathname` change calls `trackEvent("page_view", { path })` and `gaEvent("page_view", { page_path })`.
- `App.tsx` calls `usePageViews()`; the legacy `/analytics/visit` effect stays.

- [ ] **Step 1: Write the failing tests**

```ts
// src/analytics/track.test.ts
import { trackEvent, buildPayload, getSessionId } from "./track";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  window.sessionStorage.clear();
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
});

const flush = () => new Promise((r) => setTimeout(r, 0));

it("builds the documented payload with a stable per-tab session id", () => {
  const a = buildPayload("store_tap", { path: "/download", placement: "hero" });
  const b = buildPayload("page_view", { path: "/" });
  expect(a).toEqual({
    name: "store_tap", path: "/download", placement: "hero", platform: "other",
    referrer: null, language: expect.any(String), sessionId: expect.any(String),
  });
  expect(a.sessionId).toBe(b.sessionId);
  expect(a.sessionId.length).toBeGreaterThanOrEqual(8);
  expect(window.sessionStorage.getItem("bt.sid")).toBe(getSessionId());
});

it("posts JSON to the events endpoint", async () => {
  fetchMock.mockResolvedValue({ ok: true });
  trackEvent("cta_tap", { path: "/", placement: "final-cta" });
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/api\/v1\/analytics\/events$/);
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body).name).toBe("cta_tap");
});

it("retries once on failure and stays silent", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));
  expect(() => trackEvent("page_view", { path: "/" })).not.toThrow();
  await flush(); await flush();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("sends nothing until the document is ready", async () => {
  Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
  fetchMock.mockResolvedValue({ ok: true });
  trackEvent("page_view", { path: "/" });
  await flush();
  expect(fetchMock).not.toHaveBeenCalled();
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
```

```tsx
// src/analytics/usePageViews.test.tsx
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { act } from "react-dom/test-utils";
import { usePageViews } from "./usePageViews";

const track = jest.fn();
const ga = jest.fn();
jest.mock("./track", () => ({ trackEvent: (...a: unknown[]) => track(...a) }));
jest.mock("./ga", () => ({ gaEvent: (...a: unknown[]) => ga(...a) }));

const Probe: React.FC = () => { usePageViews(); return <Link to="/download">go</Link>; };

it("fires a page_view for the first route and for each change", () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes><Route path="*" element={<Probe />} /></Routes>
    </MemoryRouter>
  );
  expect(track).toHaveBeenCalledWith("page_view", { path: "/" });
  expect(ga).toHaveBeenCalledWith("page_view", { page_path: "/" });
  act(() => { getByText("go").click(); });
  expect(track).toHaveBeenLastCalledWith("page_view", { path: "/download" });
  expect(track).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/analytics/track.test.ts src/analytics/usePageViews.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Add the constant**

`src/constants.ts`, after `PUBLIC_STATS_URL`:

```ts
// First-party web events (page_view | store_tap | cta_tap). No cookie, no
// user id — a per-tab session id only. See routes/analytics.js.
export const ANALYTICS_EVENTS_URL = "/api/v1/analytics/events";
```

- [ ] **Step 4: Write `src/analytics/track.ts`**

```ts
import { ANALYTICS_EVENTS_URL, BASE_URL } from "../constants";
import { detectPlatform, MobilePlatform } from "../utils/platform";

export type EventName = "page_view" | "store_tap" | "cta_tap";

export interface EventData {
  path?: string;
  placement?: string;
}

export interface EventPayload {
  name: EventName;
  path: string;
  placement?: string;
  platform: MobilePlatform;
  referrer: string | null;
  language: string | null;
  sessionId: string;
}

const SESSION_KEY = "bt.sid";
let memorySessionId: string | null = null;

function randomId(): string {
  const c = typeof crypto !== "undefined" ? (crypto as { randomUUID?: () => string }) : undefined;
  if (c && c.randomUUID) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Per-tab id so taps can be counted per visit. Not a user identifier. */
export function getSessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    if (!memorySessionId) memorySessionId = randomId();
    return memorySessionId;
  }
}

export function buildPayload(name: EventName, data: EventData = {}): EventPayload {
  const hasNav = typeof navigator !== "undefined";
  const payload: EventPayload = {
    name,
    path: data.path || (typeof window !== "undefined" ? window.location.pathname : "/"),
    platform: detectPlatform(hasNav ? navigator.userAgent : ""),
    referrer: typeof document !== "undefined" && document.referrer ? document.referrer : null,
    language: hasNav && navigator.language ? navigator.language : null,
    sessionId: getSessionId(),
  };
  if (data.placement) payload.placement = data.placement;
  return payload;
}

async function post(payload: EventPayload): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}${ANALYTICS_EVENTS_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    } as RequestInit);
    return Boolean(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget. One retry, then silence: analytics never reaches the user.
 * Nothing is sent before the document is ready, so the prerenderer (no
 * document at all) and a still-parsing page never emit.
 */
export function trackEvent(name: EventName, data: EventData = {}): void {
  if (typeof document === "undefined") return;
  const send = () => {
    const payload = buildPayload(name, data);
    post(payload).then((ok) => {
      if (!ok) return post(payload);
      return ok;
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", send, { once: true });
  } else {
    send();
  }
}
```

- [ ] **Step 5: Write `src/analytics/usePageViews.ts`**

```ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "./track";
import { gaEvent } from "./ga";

/** One page_view per pathname, first-party always, GA only if consented (gaEvent no-ops otherwise). */
export function usePageViews(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    trackEvent("page_view", { path: pathname });
    gaEvent("page_view", { page_path: pathname });
  }, [pathname]);
}
```

- [ ] **Step 6: Call it from `App.tsx`**

Add `import { usePageViews } from "./analytics/usePageViews";` and, as the first line inside the `App` component body (before `const location = useLocation();`), `usePageViews();`.

- [ ] **Step 7: Run the tests and the suite**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/constants.ts src/analytics/track.ts src/analytics/track.test.ts src/analytics/usePageViews.ts src/analytics/usePageViews.test.tsx src/App.tsx
git commit -m "feat(analytics): first-party events with per-tab session id; page_view on route change

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 18: The consent bar (and the popup-open signal it listens to)

**Files:**
- Modify: `src/components/growth/growthGate.ts`
- Modify: `src/components/growth/AppDownloadPopup.tsx`
- Create: `src/components/growth/ConsentBar.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/growth/ConsentBar.test.tsx`, `src/components/growth/growthGate.test.ts` (two cases added)

**Interfaces:**
- `growthGate.ts` gains `export function setDownloadPopupOpen(open: boolean): void` and `export function subscribeDownloadPopup(listener: (open: boolean) => void): () => void` (calls the listener immediately with the current state; returns unsubscribe). `AppDownloadPopup` publishes its `open` state through it.
- `ConsentBar`: renders nothing until mounted (never in prerendered HTML), nothing when consent is decided, nothing while the download popup is open, nothing when `getGaId()` is empty (nothing to consent to). On mount, if stored consent is `granted`, calls `loadGa()`. "OK" → `writeConsent("granted")` + `loadGa()`; "No thanks" → `writeConsent("denied")`. Copy keys `consent.message`, `consent.accept`, `consent.decline`.

- [ ] **Step 1: Add the failing gate tests**

Append to `src/components/growth/growthGate.test.ts`:

```ts
import { setDownloadPopupOpen, subscribeDownloadPopup } from "./growthGate";

describe("download popup signal", () => {
  afterEach(() => setDownloadPopupOpen(false));

  it("delivers the current state on subscribe and every change", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeDownloadPopup((open) => seen.push(open));
    setDownloadPopupOpen(true);
    setDownloadPopupOpen(false);
    unsubscribe();
    setDownloadPopupOpen(true);
    expect(seen).toEqual([false, true, false]);
  });
});
```

(Merge the import with the file's existing `./growthGate` import.)

- [ ] **Step 2: Write the failing ConsentBar test**

```tsx
// src/components/growth/ConsentBar.test.tsx
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ConsentBar from "./ConsentBar";
import { setDownloadPopupOpen } from "./growthGate";
import { __resetGaForTests } from "../../analytics/ga";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const gaScript = () => document.querySelector("script[data-testid='ga-script']");

beforeEach(() => {
  process.env.REACT_APP_GA_MEASUREMENT_ID = "G-TEST123";
  window.localStorage.clear();
  document.head.innerHTML = "";
  __resetGaForTests();
  setDownloadPopupOpen(false);
});

it("shows by default and loads no GA", () => {
  render(<ConsentBar />);
  expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
  expect(gaScript()).toBeNull();
});

it("OK stores granted, loads GA and hides the bar", () => {
  render(<ConsentBar />);
  fireEvent.click(screen.getByText("OK"));
  expect(window.localStorage.getItem("bt.consent")).toBe("granted");
  expect(gaScript()).not.toBeNull();
  expect(screen.queryByTestId("consent-bar")).toBeNull();
});

it("No thanks stores denied and loads nothing", () => {
  render(<ConsentBar />);
  fireEvent.click(screen.getByText("No thanks"));
  expect(window.localStorage.getItem("bt.consent")).toBe("denied");
  expect(gaScript()).toBeNull();
  expect(screen.queryByTestId("consent-bar")).toBeNull();
});

it("a stored grant loads GA on mount without showing the bar", () => {
  window.localStorage.setItem("bt.consent", "granted");
  render(<ConsentBar />);
  expect(gaScript()).not.toBeNull();
  expect(screen.queryByTestId("consent-bar")).toBeNull();
});

it("shows when storage throws (undecided)", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<ConsentBar />);
  expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
  spy.mockRestore();
});

it("stands down while the download popup is open", () => {
  render(<ConsentBar />);
  act(() => setDownloadPopupOpen(true));
  expect(screen.queryByTestId("consent-bar")).toBeNull();
  act(() => setDownloadPopupOpen(false));
  expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
});

it("renders nothing when no measurement id is configured", () => {
  delete process.env.REACT_APP_GA_MEASUREMENT_ID;
  render(<ConsentBar />);
  expect(screen.queryByTestId("consent-bar")).toBeNull();
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/components/growth/growthGate.test.ts src/components/growth/ConsentBar.test.tsx`
Expected: FAIL — exports/module missing.

- [ ] **Step 4: Add the signal to `growthGate.ts`**

Append to `src/components/growth/growthGate.ts`:

```ts
// ---- Download-popup signal ------------------------------------------------
// The consent bar must not stack under the popup. The popup owns its `open`
// state; it publishes it here, and the bar subscribes. No global store needed
// for one boolean.

type PopupListener = (open: boolean) => void;
let popupOpen = false;
const popupListeners = new Set<PopupListener>();

export function setDownloadPopupOpen(open: boolean): void {
  if (popupOpen === open) return;
  popupOpen = open;
  popupListeners.forEach((listener) => listener(open));
}

/** Calls `listener` immediately with the current state; returns unsubscribe. */
export function subscribeDownloadPopup(listener: PopupListener): () => void {
  popupListeners.add(listener);
  listener(popupOpen);
  return () => {
    popupListeners.delete(listener);
  };
}
```

- [ ] **Step 5: Publish from `AppDownloadPopup.tsx`**

Change the import to `import { isSuppressed, recordDismissal, setDownloadPopupOpen } from "./growthGate";` and add, after the `dismiss` callback:

```tsx
  useEffect(() => {
    setDownloadPopupOpen(open);
    return () => setDownloadPopupOpen(false);
  }, [open]);
```

- [ ] **Step 6: Write `src/components/growth/ConsentBar.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Consent, readConsent, writeConsent } from "../../analytics/consent";
import { getGaId, loadGa } from "../../analytics/ga";
import { subscribeDownloadPopup } from "./growthGate";

/**
 * One line at the bottom: analytics cookies, OK / No thanks. Client-only —
 * it mounts after hydration so it is never in the crawler's HTML. Default
 * (undecided) means no GA. First-party events are unaffected either way.
 */
const ConsentBar: React.FC = () => {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<Consent | undefined>(undefined);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = readConsent();
    setConsent(stored);
    if (stored === "granted") loadGa();
    return subscribeDownloadPopup(setPopupOpen);
  }, []);

  if (!mounted || consent || popupOpen || !getGaId()) return null;

  const decide = (value: Consent) => {
    writeConsent(value);
    if (value === "granted") loadGa();
    setConsent(value);
  };

  return (
    <div
      data-testid="consent-bar"
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-t-card border border-gray-200 bg-surface px-4 py-2.5 text-sm shadow-float sm:bottom-0 dark:border-gray-700 dark:bg-cardbg-dark"
    >
      <span className="text-gray-700 dark:text-gray-200">
        {t("consent.message") || "We use analytics cookies to understand what brings people here."}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => decide("denied")}
          className="rounded-full px-3 py-1 text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300"
        >
          {t("consent.decline") || "No thanks"}
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          className="rounded-full bg-brand px-4 py-1 text-xs font-extrabold text-white shadow-brand"
        >
          {t("consent.accept") || "OK"}
        </button>
      </span>
    </div>
  );
};

export default ConsentBar;
```

(`bottom-16` on small screens keeps it above `StickyAppBanner`, which is `bottom-0` on mobile; on `sm:` and up the sticky banner is not shown and the bar sits at the bottom.)

- [ ] **Step 7: Mount it in `App.tsx`**

`import ConsentBar from "./components/growth/ConsentBar";` and render `<ConsentBar />` directly after `<FooterMain />`.

- [ ] **Step 8: Run the tests, the suite, and confirm the prerender does not contain the bar**

Run: `CI=true npx react-scripts test --watchAll=false && npm run build 2>&1 | tail -3 && grep -c 'data-testid="consent-bar"' build/index.html`
Expected: tests PASS; the grep prints `0`.

- [ ] **Step 9: Commit**

```bash
git add src/components/growth/growthGate.ts src/components/growth/growthGate.test.ts src/components/growth/AppDownloadPopup.tsx src/components/growth/ConsentBar.tsx src/components/growth/ConsentBar.test.tsx src/App.tsx
git commit -m "feat(analytics): consent bar gates GA4; hidden under the download popup and in prerendered HTML

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 19 (backend): `WebEvent` model and `POST /api/v1/analytics/events`

**Repo:** `/Users/davis/Desktop/Personal/language_exchange_backend_application`

**Files:**
- Create: `models/WebEvent.js`
- Modify: `middleware/rateLimiter.js` (add `eventsLimiter`)
- Modify: `routes/analytics.js` (add the route; `parseUserAgent` is already in this file)
- Test: `test/webEvents.test.js`

**Interfaces:**
- Request: `POST /api/v1/analytics/events`, body `{ name, path, placement?, platform?, referrer?, language?, sessionId }`; `name ∈ page_view | store_tap | cta_tap`; `path` starts with `/`, ≤ 300 chars; `sessionId` 8–64 chars. Response `204`. Validation failures `400` through the existing `ErrorResponse` → `{ success: false, error, message }`. Rate limited `ANALYTICS_EVENTS_PER_MINUTE` (default 60) per IP per minute → `429`.
- Stored document (`WebEvent`): `{ name, path, placement, platform, referrer, language, sessionId, ipHash, device, os, createdAt, updatedAt }`. `ipHash` = HMAC-SHA256 of the client IP with `ANALYTICS_IP_SALT` (falls back to `JWT_SECRET`); the raw IP is never stored. TTL index 400 days. `device`/`os` from `parseUserAgent`.
- Consumed by: frontend `trackEvent` (Task 17); Phase C's `GET /admin/analytics/events` aggregates this collection.

- [ ] **Step 1: Write the failing test**

```js
// test/webEvents.test.js
'use strict';
/**
 * POST /api/v1/analytics/events through the real router: validation, the
 * hashed-IP guarantee, UA parsing, and the per-IP rate limit.
 *
 * Run: node --test test/webEvents.test.js
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough-to-pass';
process.env.ANALYTICS_IP_SALT = 'test-salt';
process.env.ANALYTICS_EVENTS_PER_MINUTE = '10';   // read by rateLimiter.js at load

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, app, WebEvent;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'webEvents' });
  WebEvent = require('../models/WebEvent');
  app = express();
  app.use(express.json());
  app.use('/api/v1/analytics', require('../routes/analytics'));
  app.use(require('../middleware/error'));
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => { await WebEvent.deleteMany({}); });

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const valid = { name: 'store_tap', path: '/download', placement: 'hero', platform: 'ios', referrer: 'https://google.com/', language: 'en-US', sessionId: 'sess-12345678' };

test('stores a valid event with a hashed ip and parsed device/os, returns 204', async () => {
  const res = await request(app).post('/api/v1/analytics/events').set('User-Agent', IPHONE_UA).send(valid);
  assert.equal(res.status, 204);
  const doc = await WebEvent.findOne({}).lean();
  assert.equal(doc.name, 'store_tap');
  assert.equal(doc.path, '/download');
  assert.equal(doc.placement, 'hero');
  assert.equal(doc.sessionId, 'sess-12345678');
  assert.match(doc.ipHash, /^[0-9a-f]{64}$/);
  assert.equal(doc.ip, undefined);
  assert.equal(doc.device, 'mobile');
  assert.equal(doc.os, 'iOS');
});

test('rejects an unknown event name', async () => {
  const res = await request(app).post('/api/v1/analytics/events').send({ ...valid, name: 'purchase' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(await WebEvent.countDocuments({}), 0);
});

test('rejects a path that is not site-relative and a short sessionId', async () => {
  assert.equal((await request(app).post('/api/v1/analytics/events').send({ ...valid, path: 'https://evil.example/' })).status, 400);
  assert.equal((await request(app).post('/api/v1/analytics/events').send({ ...valid, sessionId: 'abc' })).status, 400);
});

test('optional fields are truncated, never required', async () => {
  const res = await request(app).post('/api/v1/analytics/events')
    .send({ name: 'page_view', path: '/', sessionId: 'sess-12345678', referrer: 'x'.repeat(2000) });
  assert.equal(res.status, 204);
  const doc = await WebEvent.findOne({}).lean();
  assert.equal(doc.referrer.length, 500);
  assert.equal(doc.placement, undefined);
});

test('the per-ip limit answers 429', async () => {
  const max = Number(process.env.ANALYTICS_EVENTS_PER_MINUTE);
  const statuses = [];
  for (let i = 0; i <= max; i += 1) {
    statuses.push((await request(app).post('/api/v1/analytics/events').send(valid)).status);
  }
  assert.ok(statuses.includes(204), 'some requests in the window succeed');
  assert.equal(statuses[statuses.length - 1], 429);
});
```

(Earlier tests consume part of the per-minute budget — the limiter is per process — which is why the last test asserts "the (max+1)th request in a row is 429" rather than an exact boundary.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /Users/davis/Desktop/Personal/language_exchange_backend_application && node --test test/webEvents.test.js`
Expected: FAIL — `Cannot find module '../models/WebEvent'`.

- [ ] **Step 3: Write `models/WebEvent.js`**

```js
const mongoose = require('mongoose');

/**
 * First-party web events from banatalk.com (page_view / store_tap / cta_tap).
 * Separate from WebVisit on purpose: WebVisit is one row per page load with
 * geo lookup; this is a lightweight, high-volume event stream with no raw IP.
 * `ipHash` is an HMAC with a server salt so the same visitor can be grouped
 * without the address ever being stored.
 */
const WebEventSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: ['page_view', 'store_tap', 'cta_tap'], index: true },
  path: { type: String, required: true },
  placement: String,
  platform: String,
  referrer: String,
  language: String,
  sessionId: { type: String, required: true, index: true },
  ipHash: { type: String, index: true },
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  os: String,
}, { timestamps: true });

// 400 days: enough for a year-over-year view in the admin console.
WebEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });
WebEventSchema.index({ name: 1, createdAt: -1 });
WebEventSchema.index({ placement: 1, platform: 1, createdAt: -1 });

module.exports = mongoose.model('WebEvent', WebEventSchema);
```

- [ ] **Step 4: Add `eventsLimiter` to `middleware/rateLimiter.js`**

Append:

```js
/**
 * First-party web events. Per IP, per minute; the frontend sends at most a
 * handful per page, so 60 is generous for a human and tight for a loop.
 * ANALYTICS_EVENTS_PER_MINUTE overrides (tests set it low).
 */
exports.eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANALYTICS_EVENTS_PER_MINUTE) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many events from this IP, please slow down.',
    message: 'Too many events from this IP, please slow down.'
  }
});
```

- [ ] **Step 5: Add the route to `routes/analytics.js`**

After the existing `require` lines add:

```js
const crypto = require('crypto');
const WebEvent = require('../models/WebEvent');
const ErrorResponse = require('../utils/errorResponse');
const { eventsLimiter } = require('../middleware/rateLimiter');

const EVENT_NAMES = ['page_view', 'store_tap', 'cta_tap'];

const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.headers['x-real-ip']
  || req.ip
  || (req.connection && req.connection.remoteAddress)
  || 'unknown';

// HMAC, not a plain hash: without the salt an IPv4 space is trivially
// brute-forceable from the digest.
const hashIp = (ip) => crypto
  .createHmac('sha256', process.env.ANALYTICS_IP_SALT || process.env.JWT_SECRET || 'bananatalk-analytics')
  .update(String(ip))
  .digest('hex');

const clip = (value, max) => (typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined);
```

and before `module.exports = router;`:

```js
/**
 * @desc    Record a first-party web event (page_view | store_tap | cta_tap)
 * @route   POST /api/v1/analytics/events
 * @access  Public (rate limited). Stores no raw IP and no user id.
 */
router.post('/events', eventsLimiter, asyncHandler(async (req, res, next) => {
  const { name, path, placement, platform, referrer, language, sessionId } = req.body || {};

  if (!EVENT_NAMES.includes(name)) {
    return next(new ErrorResponse('Invalid event name', 400));
  }
  if (typeof path !== 'string' || path[0] !== '/' || path.length > 300) {
    return next(new ErrorResponse('Invalid path', 400));
  }
  if (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 64) {
    return next(new ErrorResponse('Invalid sessionId', 400));
  }

  const { device, os } = parseUserAgent(req.headers['user-agent'] || '');

  await WebEvent.create({
    name,
    path,
    placement: clip(placement, 60),
    platform: clip(platform, 20),
    referrer: clip(referrer, 500),
    language: clip(language, 20),
    sessionId,
    ipHash: hashIp(clientIp(req)),
    device,
    os
  });

  res.status(204).end();
}));
```

- [ ] **Step 6: Run the test**

Run: `node --test test/webEvents.test.js`
Expected: PASS (5 tests). If the 429 test fails because `req.ip` differs per request under supertest, add `app.set('trust proxy', false)` in the test's app setup — supertest connects from `127.0.0.1` / `::ffff:127.0.0.1` consistently, so this should not be needed.

- [ ] **Step 7: Run the backend's whole suite to make sure nothing else moved**

Run: `npm test 2>&1 | tail -5`
Expected: same pass/fail profile as before plus the new file passing (`# fail 0` if the suite was green).

- [ ] **Step 8: Commit**

```bash
git add models/WebEvent.js middleware/rateLimiter.js routes/analytics.js test/webEvents.test.js
git commit -m "feat(analytics): first-party web events endpoint with hashed ip and per-ip rate limit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 20 (backend): `GET /api/v1/public/stats`

**Repo:** `/Users/davis/Desktop/Personal/language_exchange_backend_application`

**Files:**
- Create: `controllers/publicStats.js`, `routes/public.js`
- Modify: `server.js` (mount next to the analytics router, ~line 363)
- Test: `test/publicStats.test.js`

**Interfaces:**
- Response `200 { success: true, data: { learners, languages, countries, generatedAt } }` with `Cache-Control: public, max-age=300`.
  - `learners`: count of users with `isBanned != true`, rounded **down** to two significant figures (12,431 → 12,000); `null` when the raw count is below 1,000.
  - `languages`: `Language.countDocuments()`; when the catalog collection is empty (dev databases) the known catalog size 137.
  - `countries`: number of distinct non-empty `location.country` values among non-banned users, same rounding; `null` when zero.
  - `generatedAt`: ISO timestamp of computation.
- In-memory cache, 1 hour; `exports.__resetPublicStatsCache()` for tests; `exports.roundDownTwoSig(n)` exported for the unit test.
- Consumed by: frontend `publicStatsSlice` (Task 11) and the prerender prefetch (Task 12).

- [ ] **Step 1: Write the failing test**

```js
// test/publicStats.test.js
'use strict';
/**
 * GET /api/v1/public/stats: rounding, the 1,000 floor, the country count and
 * the one-hour cache — the numbers the homepage shows to strangers.
 *
 * Run: node --test test/publicStats.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, app, User, Language, publicStats;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'publicStats' });
  User = require('../models/User');
  Language = require('../models/Language');
  publicStats = require('../controllers/publicStats');
  app = express();
  app.use('/api/v1/public', require('../routes/public'));
  app.use(require('../middleware/error'));
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Language.deleteMany({})]);
  publicStats.__resetPublicStatsCache();
});

// Raw inserts: the User pre-save hooks (password hashing) would make a
// thousand documents take minutes, and only counts matter here.
// `username` is unique on the schema, so every seeded document gets its own.
let seedRun = 0;
const seedUsers = (n, over = () => ({})) => {
  seedRun += 1;
  return User.collection.insertMany(
    Array.from({ length: n }, (_, i) => ({
      name: `u${i}`, username: `seed${seedRun}_${i}`, email: `u${i}@example.com`,
      password: 'x', isBanned: false, ...over(i),
    }))
  );
};

test('roundDownTwoSig keeps two significant figures, rounding down', () => {
  const r = publicStats.roundDownTwoSig;
  assert.equal(r(12431), 12000);
  assert.equal(r(999), 990);
  assert.equal(r(1000), 1000);
  assert.equal(r(137), 130);
  assert.equal(r(23), 23);
  assert.equal(r(5), 5);
  assert.equal(r(0), 0);
});

test('learners is null under 1,000 and rounded down above it; banned users are excluded', async () => {
  await seedUsers(999);
  let res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.learners, null);

  publicStats.__resetPublicStatsCache();
  await seedUsers(250, (i) => ({ email: `b${i}@example.com`, isBanned: i < 44 }));   // 999 + 206 non-banned = 1205
  res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.body.data.learners, 1200);
  assert.match(res.body.data.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(res.headers['cache-control'], 'public, max-age=300');
});

test('languages comes from the catalog, falling back to 137 when it is empty', async () => {
  let res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.body.data.languages, 137);
  publicStats.__resetPublicStatsCache();
  await Language.collection.insertMany([{ code: 'ko', name: 'Korean', nativeName: '한국어' }, { code: 'en', name: 'English', nativeName: 'English' }]);
  res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.body.data.languages, 2);
});

test('countries counts distinct non-empty location.country among non-banned users', async () => {
  const countries = ['KR', 'US', 'JP', 'DE', 'FR', 'BR', 'IN', 'VN', 'TH', 'TR', 'ES', 'IT'];
  await seedUsers(30, (i) => ({ location: { country: countries[i % countries.length] } }));
  await seedUsers(3, (i) => ({ email: `n${i}@example.com`, location: { country: '' } }));
  await seedUsers(1, () => ({ email: 'ban@example.com', isBanned: true, location: { country: 'ZZ' } }));
  const res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.body.data.countries, 12);
});

test('countries is null when nobody has one', async () => {
  await seedUsers(5);
  const res = await request(app).get('/api/v1/public/stats');
  assert.equal(res.body.data.countries, null);
});

test('the result is cached for an hour', async () => {
  await seedUsers(1000);
  const first = await request(app).get('/api/v1/public/stats');
  assert.equal(first.body.data.learners, 1000);
  await seedUsers(500, (i) => ({ email: `c${i}@example.com` }));
  const second = await request(app).get('/api/v1/public/stats');
  assert.equal(second.body.data.learners, 1000, 'served from cache');
  assert.equal(second.body.data.generatedAt, first.body.data.generatedAt);
  publicStats.__resetPublicStatsCache();
  const third = await request(app).get('/api/v1/public/stats');
  assert.equal(third.body.data.learners, 1500);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/publicStats.test.js`
Expected: FAIL — `Cannot find module '../controllers/publicStats'`.

- [ ] **Step 3: Write `controllers/publicStats.js`**

```js
const User = require('../models/User');
const Language = require('../models/Language');
const asyncHandler = require('../middleware/async');

/**
 * Public, unauthenticated figures for the marketing pages. Every number here
 * is rounded down so the page never shows a figure that is stale by
 * lunchtime, and the learner count hides below 1,000 so early days do not
 * read as empty. One source of truth: the frontend never hardcodes these.
 */

const CACHE_MS = 60 * 60 * 1000;
const MIN_LEARNERS = 1000;
// The Language collection is the catalog; this is its known size for a
// database that has not been seeded (local dev).
const CATALOG_SIZE = 137;

let cache = null;

/** 12431 -> 12000, 999 -> 990, 137 -> 130, 23 -> 23. Never rounds up. */
function roundDownTwoSig(n) {
  if (!Number.isFinite(n) || n < 10) return Math.max(0, Math.floor(n));
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.floor(n / magnitude) * magnitude;
}

async function computeStats() {
  const notBanned = { isBanned: { $ne: true } };
  const [rawLearners, catalog, countries] = await Promise.all([
    User.countDocuments(notBanned),
    Language.countDocuments({}),
    User.distinct('location.country', { ...notBanned, 'location.country': { $nin: [null, ''] } }),
  ]);
  return {
    learners: rawLearners < MIN_LEARNERS ? null : roundDownTwoSig(rawLearners),
    languages: catalog || CATALOG_SIZE,
    countries: countries.length ? roundDownTwoSig(countries.length) : null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @desc    Public site statistics
 * @route   GET /api/v1/public/stats
 * @access  Public. Cached in memory for one hour.
 */
exports.getPublicStats = asyncHandler(async (req, res) => {
  const now = Date.now();
  if (!cache || cache.expiresAt <= now) {
    cache = { value: await computeStats(), expiresAt: now + CACHE_MS };
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.status(200).json({ success: true, data: cache.value });
});

exports.roundDownTwoSig = roundDownTwoSig;
exports.__resetPublicStatsCache = () => { cache = null; };
```

- [ ] **Step 4: Write `routes/public.js` and mount it**

```js
const express = require('express');
const { getPublicStats } = require('../controllers/publicStats');

// Unauthenticated read-only endpoints for the marketing site. Nothing here
// may ever require a token or return per-user data.
const router = express.Router();

router.get('/stats', getPublicStats);

module.exports = router;
```

In `server.js`, directly after `app.use('/api/v1/analytics', require('./routes/analytics'));` add:

```js
app.use('/api/v1/public', require('./routes/public')); // marketing-site reads: stats (Phase A), communities (Phase B)
```

- [ ] **Step 5: Run the test and the backend suite**

Run: `node --test test/publicStats.test.js && npm test 2>&1 | tail -5`
Expected: PASS (6 tests); suite profile unchanged otherwise.

- [ ] **Step 6: Smoke the mounted route against a running backend (optional if the local DB is not configured)**

Run: `PORT=5003 node server.js &` then `curl -s -i http://localhost:5003/api/v1/public/stats | head -12`; stop the server.
Expected: `200`, `Cache-Control: public, max-age=300`, a JSON body with the four fields.

- [ ] **Step 7: Commit**

```bash
git add controllers/publicStats.js routes/public.js server.js test/publicStats.test.js
git commit -m "feat(public): GET /api/v1/public/stats — rounded learner/country counts, 1h cache

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 21: End-to-end verification of Phase A

**Files:** none created. This task proves the phase's deliverables against the spec before it is called done.

- [ ] **Step 1: Frontend suite is green**

Run (frontend root): `CI=true npx react-scripts test --watchAll=false 2>&1 | tail -8`
Expected: `Tests: … passed`, 0 failed.

- [ ] **Step 2: Backend suite is green**

Run (backend root): `npm test 2>&1 | tail -6`
Expected: `# fail 0`.

- [ ] **Step 3: Production build with the real API reachable**

Run (frontend root): `npm run build 2>&1 | grep -E "prerender|Compiled|Failed" `
Expected: `Compiled successfully`, eight `[prerender] … ->` lines, `sitemap.xml with 7 urls`, and **no** prefetch warning for `/` when the API is up (if the API is down: exactly the warnings for `stats`/`plans` and nothing else).

- [ ] **Step 4: Inspect the crawler's view of the homepage**

```bash
node -e '
const fs=require("fs");const h=fs.readFileSync("build/index.html","utf8");
const pick=(re)=>(h.match(re)||[]).length;
console.log({
  h1: pick(/<h1[\s>]/g), titles: pick(/<title/g), canonicals: pick(/rel="canonical"/g),
  hreflang: pick(/hreflang/g), robotsIndex: pick(/name="robots" content="index/g),
  noindex: pick(/noindex/g), hydrationScript: pick(/__staticRouterHydrationData/g),
  consentBar: pick(/consent-bar/g), rootFilled: /<div id="root"><(?!\/div)/.test(h),
  learnerStat: /stat-item/.test(h)
});'
```
Expected: `{ h1: 1, titles: 1, canonicals: 1, hreflang: 0, robotsIndex: 1, noindex: 0, hydrationScript: 0, consentBar: 0, rootFilled: true, learnerStat: true }`.

- [ ] **Step 5: Inspect the 404 and a legal page**

```bash
grep -o '<title data-rh="true">[^<]*' build/404.html build/terms-of-use/index.html
grep -c 'noindex, nofollow' build/404.html            # 1
grep -c 'rel="canonical"' build/404.html              # 0
grep -o '<h1[^>]*>[^<]*' build/terms-of-use/index.html # Terms of Use
```

- [ ] **Step 6: Serve and click through**

Run: `npx serve -s build -l 5050` and in a browser:
1. `http://localhost:5050/` — content visible before JS; after load the language switcher works; `document.title` is the SEO title; `localStorage.getItem("i18nextLng")` is `null` until you pick a language, then set.
2. Accept the consent bar (with `REACT_APP_GA_MEASUREMENT_ID` set in `.env.production` for this check — or confirm the bar is absent when it is not set); a `gtag/js` request appears in the Network tab; reload — no bar, GA loads.
3. Navigate `/` → `/download` → `/nope`: the 404 page renders client-side; the Network tab shows one `POST /api/v1/analytics/events` per navigation with `name: "page_view"` (if the API is reachable).
4. Open `http://localhost:5050/download` directly — served from `build/download/index.html` (view source shows the download title).
Stop `serve`.

- [ ] **Step 7: Spec coverage check (read-only)**

Tick each against the spec: §3 page set (Phase A rows, `/communities` deferred to B — noted in `publicRoutes.ts`); §4.1 metadata layer, dynamic profile, `index.html`/manifest; §4.2 route split, harness, loud failure, build-time data, hydration, English-first; §4.3 generated sitemap, `public/sitemap.xml` deleted; §4.4 catch-all, nginx snippet (301/410 lists), README, footer; §4.5 GA behind consent, consent bar, first-party events, `/analytics/visit` untouched; §4.6 stats endpoint, `StatStrip`; §7.1 and §7.3 backend; §8 error handling; §9 every listed Phase A test exists (`pages`, `renderRoute`, sitemap, `track`, `ConsentBar`, `NotFound`, locale parity, hydration chooser; `StoreLink`, landing pages, bundle budget and admin tests belong to Phases B/C). Anything unticked is a task to add before this phase is closed.

- [ ] **Step 8: Push (only if the user asks) and hand off**

Report: commits made in both repos, the two things that need a human — pasting `deploy/nginx.snippet.conf` into the live nginx config and setting `REACT_APP_GA_MEASUREMENT_ID` / `ANALYTICS_IP_SALT` in the server environments — and that Phase B's plan can start from `/communities`, `StoreLink`, and the landing pages.

---

## Deviations from the spec, recorded

- **"Proxy on `globalThis` that throws"** (§4.2) is implemented as *deleting* Node's `navigator`/`localStorage`/`sessionStorage` before the app loads: a throwing getter would make every `typeof window === "undefined"` guard throw, defeating the guards the spec itself prescribes; an absent binding gives the same loud `ReferenceError` on a real read.
- **`/communities` is not prerendered in Phase A.** `MainCommunity` `<Navigate>`s logged-out visitors to `/login`; the static handler cannot follow that and the harness would fail the build. Phase B adds `PublicCommunities` and lists the route (spec §5.5).
- **`/pen-pals` → `/`** in the nginx snippet for now; Phase B changes it to `/meet` when that route exists.
- **`NotFound` stays in `src/components/error/`** (the spec says `errors/`); the directory already existed.
- **Site-wide OG image** is the existing `/og-image.png`, not a new `/og-default.png`.
- **Stats response is enveloped** as `{ success, data }` to match every other endpoint in the backend; the slice unwraps it.
- **`react-scripts test` finds tests only under `src/`**, so the prerender harness lives in `src/prerender/` (pure, no `fs`) and only the CLI lives in `scripts/`.
