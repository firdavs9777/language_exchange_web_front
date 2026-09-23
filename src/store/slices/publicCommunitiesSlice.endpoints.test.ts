/**
 * Task B5: the public communities endpoint must hit the real, unauthenticated
 * backend route (`GET /api/v1/public/communities`, controllers/public.js) and
 * unwrap the `{ success, data }` envelope the way publicStatsSlice does --
 * the prerender prefetch and the page both read `data` directly.
 *
 * Mirrors the mocked-fetch pattern of momentsSlice.endpoints.test.ts.
 */
import { makeStore } from "../../store";
import { publicCommunitiesApiSlice } from "./publicCommunitiesSlice";
import { PUBLIC_COMMUNITIES_URL } from "../../constants";

type Captured = { url: string; method: string };

function mockFetch(payload: any, status = 200): Captured[] {
  const calls: Captured[] = [];
  (global as any).fetch = jest.fn(async (req: any) => {
    calls.push({ url: req.url, method: req.method });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
  return calls;
}

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

const SAMPLE = [
  { id: "c1", name: "Korean Corner", description: "Daily Korean practice", memberCount: 412, languages: ["Korean"] },
];

it("GETs /api/v1/public/communities with no arguments", async () => {
  const calls = mockFetch({ success: true, data: SAMPLE });
  const store = makeStore();
  await store.dispatch(publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate());

  expect(calls).toHaveLength(1);
  const url = new URL(calls[0].url);
  expect(url.pathname).toBe(PUBLIC_COMMUNITIES_URL);
  expect(url.search).toBe("");
  expect(calls[0].method).toBe("GET");
});

it("sends no Authorization header -- the route is public", async () => {
  const headers: Array<string | null> = [];
  (global as any).fetch = jest.fn(async (req: any) => {
    headers.push(req.headers?.get ? req.headers.get("authorization") : null);
    return new Response(JSON.stringify({ success: true, data: SAMPLE }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const store = makeStore();
  await store.dispatch(publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate());
  expect(headers).toEqual([null]);
});

it("unwraps the { success, data } envelope into the array the page renders", async () => {
  mockFetch({ success: true, data: SAMPLE });
  const store = makeStore();
  const result: any = await store.dispatch(
    publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate()
  );
  expect(result.data).toEqual(SAMPLE);
});

// A backend that ever answers with a bare array (or an empty envelope) must
// not crash the grid: the page maps over whatever comes back.
it("falls back to an empty array when the envelope carries no data", async () => {
  mockFetch({ success: true });
  const store = makeStore();
  const result: any = await store.dispatch(
    publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate()
  );
  expect(result.data).toEqual([]);
});

// The prerender ships a fulfilled cache entry in window.__BT_PRELOADED_STATE__,
// so a mount that reused it would show build-time data forever.
// `refetchOnMountOrArgChange` is inert as a per-endpoint option in RTK 2.2, so
// `forceRefetch` is the equivalent -- asserted here by behaviour, not config.
it("re-fetches against an already-fulfilled cache entry instead of serving it", async () => {
  const calls = mockFetch({ success: true, data: SAMPLE });
  const store = makeStore();
  await store.dispatch(publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate());
  expect(calls).toHaveLength(1);
  await store.dispatch(publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate());
  expect(calls).toHaveLength(2);
});
