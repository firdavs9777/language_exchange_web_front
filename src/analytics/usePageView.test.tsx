import React from "react";
import { render, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router-dom";
import { usePageView } from "./usePageView";

jest.mock("./ga", () => ({ gaEvent: jest.fn() }));
jest.mock("../store", () => ({
  __esModule: true,
  default: { getState: () => ({ auth: { userInfo: null } }) },
}));

const Layout: React.FC = () => {
  usePageView();
  return <Outlet />;
};
const Page: React.FC = () => <div>page</div>;

function makeRouter(entry: string) {
  return createMemoryRouter(
    [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <Page /> },
          { path: "about", element: <Page /> },
          { path: "admin/reports", element: <Page /> },
          { path: "profile/:userId", element: <Page /> },
        ],
      },
    ],
    { initialEntries: [entry] }
  );
}

const events = () =>
  (global.fetch as jest.Mock).mock.calls
    .filter(([url]) => String(url).includes("/analytics/events"))
    .map(([, init]) => JSON.parse(init.body));

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  window.sessionStorage.clear();
  jest.useFakeTimers();
  setVisibility("visible");
  (global as any).fetch = jest.fn(async () => new Response(null, { status: 204 }));
});
afterEach(() => {
  jest.useRealTimers();
});

it("tracks the route template, not the concrete path", () => {
  render(<RouterProvider router={makeRouter("/profile/u42")} />);
  const [ev] = events();
  expect(ev.name).toBe("page_view");
  expect(ev.path).toBe("/profile/:userId");
  expect(JSON.stringify(ev)).not.toContain("u42");
});

it("legacy /analytics/visit is no longer called", () => {
  render(<RouterProvider router={makeRouter("/about")} />);
  const urls = (global.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
  expect(urls.some((u) => u.includes("/analytics/visit"))).toBe(false);
});

it("page_leave sums visible time only and is sent on route change", async () => {
  const router = makeRouter("/");
  render(<RouterProvider router={router} />);
  act(() => { jest.advanceTimersByTime(4000); });
  act(() => setVisibility("hidden"));
  act(() => { jest.advanceTimersByTime(10000); });
  act(() => setVisibility("visible"));
  act(() => { jest.advanceTimersByTime(2000); });
  await act(async () => { await router.navigate("/about"); });
  const evs = events();
  const leaves = evs.filter((e) => e.name === "page_leave");
  // 4 s sent when hidden, 2 s on the route change: no double counting
  expect(leaves.map((l) => l.durationMs)).toEqual([4000, 2000]);
  expect(leaves[1].path).toBe("/");
  const names = evs.map((e) => e.name);
  expect(names.slice(-2)).toEqual(["page_leave", "page_view"]);
  expect(evs[evs.length - 1].path).toBe("/about");
  expect(evs[evs.length - 1].landing).toBe(false);
  expect(evs[0].landing).toBe(true);
});

it("page_leave is sent on pagehide, capped at 30 minutes, never with 0 ms", () => {
  render(<RouterProvider router={makeRouter("/")} />);
  act(() => { window.dispatchEvent(new Event("pagehide")); }); // 0 ms: nothing
  expect(events().filter((e) => e.name === "page_leave")).toHaveLength(0);
  act(() => { jest.advanceTimersByTime(2 * 60 * 60 * 1000); });
  act(() => { window.dispatchEvent(new Event("pagehide")); });
  const leaves = events().filter((e) => e.name === "page_leave");
  expect(leaves).toHaveLength(1);
  expect(leaves[0].durationMs).toBe(1800000);
});

it("sends nothing on /admin routes", async () => {
  const router = makeRouter("/admin/reports");
  render(<RouterProvider router={router} />);
  act(() => { jest.advanceTimersByTime(3000); });
  act(() => { window.dispatchEvent(new Event("pagehide")); });
  expect(events()).toHaveLength(0);
});
