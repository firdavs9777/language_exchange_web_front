/**
 * The admin slice is the only thing the six admin pages talk to, so this test
 * pins two things the pages depend on and nothing else:
 *
 *  1. every endpoint named in the plan exists, with the URL the backend
 *     actually serves (`routes/admin.js`), and
 *  2. a ban really does invalidate the user list — asserted the way a user
 *     experiences it (the list refetches), not by reading tag arrays.
 *
 * Idiom follows communityEndpoints.test.ts: dispatch `.initiate(...)` against
 * a real store with a mocked `global.fetch` and inspect the outgoing Request.
 */
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import { adminApiSlice } from "./adminSlice";

function makeStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (state: any = { userInfo: null }) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

type Captured = { url: string; method: string; body: string | undefined };

function mockFetch(payload: any = { success: true, data: [] }): Captured[] {
  const calls: Captured[] = [];
  (global as any).fetch = jest.fn(async (req: any) => {
    const body = req.body ?? (req.clone ? await req.clone().text() : undefined);
    calls.push({ url: req.url, method: req.method, body });
    return new Response(JSON.stringify(payload), {
      status: 200,
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

const ENDPOINT_NAMES = [
  "getAdminStats",
  "getAdminActivity",
  "searchAdminUsers",
  "getAdminUser",
  "banAdminUser",
  "unbanAdminUser",
  "changeAdminUserRole",
  "getBannedUsers",
  "hardDeleteAdminUser",
  "getAuditLog",
  "getAiUsage",
  "getAiUsageLogs",
  "getAdminClubs",
  "getAdminGatherings",
  "archiveAdminClub",
  "cancelAdminGathering",
  "getAnalyticsEvents",
  "getAnalyticsVisits",
];

it("exposes every endpoint the admin pages import", () => {
  const names = Object.keys((adminApiSlice as any).endpoints);
  for (const name of ENDPOINT_NAMES) {
    expect(names).toContain(name);
  }
});

it("exports a hook per endpoint", () => {
  const slice = adminApiSlice as any;
  expect(typeof slice.useGetAdminStatsQuery).toBe("function");
  expect(typeof slice.useSearchAdminUsersQuery).toBe("function");
  expect(typeof slice.useBanAdminUserMutation).toBe("function");
  expect(typeof slice.useGetAnalyticsEventsQuery).toBe("function");
});

describe("request shapes match routes/admin.js", () => {
  it("searchAdminUsers -> GET /api/v1/admin/users with q/adminsOnly/page/limit", async () => {
    const calls = mockFetch({ success: true, data: [], pagination: { total: 0 } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).searchAdminUsers.initiate({
        q: "ada",
        adminsOnly: true,
        page: 2,
        limit: 25,
      })
    );
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/api/v1/admin/users");
    expect(calls[0].method).toBe("GET");
    expect(url.searchParams.get("q")).toBe("ada");
    expect(url.searchParams.get("adminsOnly")).toBe("true");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("banAdminUser -> POST /api/v1/admin/users/:id/ban with {reason}", async () => {
    const calls = mockFetch({ success: true, data: { message: "User banned" } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).banAdminUser.initiate({ id: "u1", reason: "spam" })
    );
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/users/u1/ban");
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body as string)).toEqual({ reason: "spam" });
  });

  it("changeAdminUserRole -> PUT /api/v1/admin/users/:id/role with {role, reason}", async () => {
    const calls = mockFetch({ success: true, data: { previousRole: "user", newRole: "admin" } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).changeAdminUserRole.initiate({
        id: "u1",
        role: "admin",
        reason: "promotion",
      })
    );
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/users/u1/role");
    expect(calls[0].method).toBe("PUT");
    expect(JSON.parse(calls[0].body as string)).toEqual({ role: "admin", reason: "promotion" });
  });

  it("hardDeleteAdminUser -> DELETE /api/v1/admin/users/:id", async () => {
    const calls = mockFetch({ success: true, data: {} });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).hardDeleteAdminUser.initiate({ id: "u1", reason: "gdpr" })
    );
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/users/u1");
    expect(calls[0].method).toBe("DELETE");
  });

  it("cancelAdminGathering -> POST /api/v1/admin/content/gatherings/:id/cancel", async () => {
    const calls = mockFetch({ success: true, data: { _id: "g1", status: "cancelled" } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).cancelAdminGathering.initiate({ id: "g1", reason: "dupe" })
    );
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/content/gatherings/g1/cancel");
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body as string)).toEqual({ reason: "dupe" });
  });

  it("archiveAdminClub -> POST /api/v1/admin/content/clubs/:id/archive with {archived, reason}", async () => {
    const calls = mockFetch({ success: true, data: { _id: "c1", status: "archived" } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).archiveAdminClub.initiate({
        id: "c1",
        archived: true,
        reason: "spam",
      })
    );
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/content/clubs/c1/archive");
    expect(JSON.parse(calls[0].body as string)).toEqual({ archived: true, reason: "spam" });
  });

  it("getAnalyticsEvents -> GET /api/v1/admin/analytics/events?days=", async () => {
    const calls = mockFetch({ success: true, data: { byDay: [] } });
    const store = makeStore();
    await store.dispatch(
      (adminApiSlice.endpoints as any).getAnalyticsEvents.initiate({ days: 7 })
    );
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/api/v1/admin/analytics/events");
    expect(url.searchParams.get("days")).toBe("7");
  });

  it("getAnalyticsVisits -> GET /api/v1/admin/analytics/visits", async () => {
    const calls = mockFetch({ success: true, data: { thisWeek: {} } });
    const store = makeStore();
    await store.dispatch((adminApiSlice.endpoints as any).getAnalyticsVisits.initiate(undefined));
    expect(new URL(calls[0].url).pathname).toBe("/api/v1/admin/analytics/visits");
  });
});

describe("transformResponse unwraps the {success, data} envelope", () => {
  it("keeps pagination alongside the rows for paginated lists", async () => {
    mockFetch({ success: true, data: [{ _id: "u1" }], pagination: { total: 1, page: 1, hasMore: false } });
    const store = makeStore();
    const res: any = await store.dispatch(
      (adminApiSlice.endpoints as any).searchAdminUsers.initiate({})
    );
    expect(res.data.data).toEqual([{ _id: "u1" }]);
    expect(res.data.pagination).toEqual({ total: 1, page: 1, hasMore: false });
  });

  it("returns bare data for unpaginated reads", async () => {
    mockFetch({ success: true, data: { total: 42, banned: 1 } });
    const store = makeStore();
    const res: any = await store.dispatch(
      (adminApiSlice.endpoints as any).getAdminStats.initiate(undefined)
    );
    expect(res.data).toEqual({ total: 42, banned: 1 });
  });
});

it("banning a user refetches the user list (AdminUserList invalidation)", async () => {
  const calls = mockFetch({ success: true, data: [], pagination: { total: 0 } });
  const store = makeStore();

  // A live subscription, the way the Users page holds one.
  const sub: any = store.dispatch(
    (adminApiSlice.endpoints as any).searchAdminUsers.initiate({ page: 1 })
  );
  await sub;
  expect(calls).toHaveLength(1);

  await store.dispatch(
    (adminApiSlice.endpoints as any).banAdminUser.initiate({ id: "u1", reason: "spam" })
  );

  // The ban itself is call 2; the invalidated list refetch is call 3.
  const deadline = Date.now() + 2000;
  while (calls.length < 3 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(calls.length).toBeGreaterThanOrEqual(3);
  expect(calls.filter((c) => new URL(c.url).pathname === "/api/v1/admin/users").length)
    .toBeGreaterThanOrEqual(2);

  sub.unsubscribe();
});
