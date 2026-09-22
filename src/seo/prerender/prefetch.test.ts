import { prefetchersFor } from "./prefetch";
import { makeStore } from "../../store";

it("prefetches plans and public stats for the homepage, nothing for legal pages", async () => {
  const calls: string[] = [];
  (global as any).fetch = jest.fn(async (input: any) => {
    calls.push(typeof input === "string" ? input : input.url);
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const store = makeStore();
  await Promise.all(prefetchersFor("/").map((run) => run(store)));
  expect(calls.some((u) => u.includes("/purchases/plans"))).toBe(true);
  expect(calls.some((u) => u.includes("/public/stats"))).toBe(true);

  expect(prefetchersFor("/privacy-policy")).toEqual([]);
});
