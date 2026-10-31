import { makeStore } from "../index";
import { communityApiSlice } from "./communitySlice";

/**
 * Audit 2026-10-30: sendWave / markWavesRead invalidated the whole
 * "Community" tag, so every wave refetched the member list, topic people
 * and nearby. Waves have their own tag now.
 */
const originalFetch = global.fetch;
const urls: string[] = [];

beforeEach(() => {
  urls.length = 0;
  (global as any).fetch = jest.fn((input: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    urls.push(url);
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });
});
afterEach(() => {
  global.fetch = originalFetch;
});

it("sending a wave does not refetch the member list", async () => {
  const store = makeStore({ auth: { userInfo: { user: { _id: "u1" }, token: "t" } } } as any);
  const sub = store.dispatch(
    communityApiSlice.endpoints.getCommunityMembers.initiate({ page: "1", limit: "20" } as any)
  );
  await sub;
  const before = urls.filter((u) => u.indexOf("/auth/users?") >= 0).length;
  await store.dispatch(
    communityApiSlice.endpoints.sendWave.initiate({ targetUserId: "x" } as any)
  );
  await new Promise((r) => setTimeout(r, 50));
  expect(urls.filter((u) => u.indexOf("/auth/users?") >= 0).length).toBe(before);
  sub.unsubscribe();
});
