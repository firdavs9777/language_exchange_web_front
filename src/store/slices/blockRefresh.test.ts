import { makeStore } from "../index";
import { communityApiSlice } from "./communitySlice";
import { usersApiSlice } from "./usersSlice";

/**
 * Audit 2026-10-30: block / unblock did not invalidate the community lists,
 * so a blocked member stayed in Partners and For you until a reload.
 */
const originalFetch = global.fetch;
const urls: string[] = [];
beforeEach(() => {
  urls.length = 0;
  (global as any).fetch = jest.fn((input: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    urls.push(url);
    return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
  });
});
afterEach(() => { global.fetch = originalFetch; });

it("blocking someone refetches the member list", async () => {
  const store = makeStore({ auth: { userInfo: { user: { _id: "u1" }, token: "t" } } } as any);
  const sub = store.dispatch(communityApiSlice.endpoints.getCommunityMembers.initiate({ page: "1", limit: "20" } as any));
  await sub;
  const before = urls.filter((u) => u.indexOf("/auth/users?") >= 0).length;
  const block: any = (usersApiSlice as any).endpoints.blockUser;
  await store.dispatch(block.initiate({ userId: "u1", targetUserId: "x" } as any));
  await new Promise((r) => setTimeout(r, 50));
  expect(urls.filter((u) => u.indexOf("/auth/users?") >= 0).length).toBeGreaterThan(before);
  sub.unsubscribe();
});

// Final review: only the last cached page refetched after a block, so a
// blocked member on page 1 stayed on the grid on Back. A block now drops
// the cached pages.
it("blocking someone clears the cached list pages", async () => {
  const { pagedListCacheSize, resetPagedListCache, primePagedListCache } = require("../../components/community/lib/usePagedList");
  resetPagedListCache();
  primePagedListCache("k", [[{ _id: "a" }]]);
  expect(pagedListCacheSize()).toBe(1);
  const store = makeStore({ auth: { userInfo: { user: { _id: "u1" }, token: "t" } } } as any);
  const block: any = (usersApiSlice as any).endpoints.blockUser;
  await store.dispatch(block.initiate("x"));
  expect(pagedListCacheSize()).toBe(0);
});
