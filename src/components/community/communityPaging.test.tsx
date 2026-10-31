import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { createMemoryRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import { makeStore } from "../../store";
import MainCommunity from "./MainCommunity";
import { resetPagedListCache } from "./lib/usePagedList";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ children }: any) => children || null,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("../../design/notify", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn(), show: jest.fn(), dismiss: jest.fn() },
}));

const PAGE_LIMIT = 20;
const page = Array.from({ length: PAGE_LIMIT }, (unused, i) => ({
  _id: `m${i}`, name: `Member ${i}`, native_language: "Korean", language_to_learn: "English", imageUrls: [],
}));
const originalFetch = global.fetch;
let membersBody: any;
let membersStatus = 0;

// Loaded pages are cached per question across mounts (Back restores them);
// every test starts from an empty cache.
beforeEach(() => resetPagedListCache());
beforeEach(() => {
  (global as any).IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
  (global as any).fetch = jest.fn((input: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const isMembers = /\/auth\/users\?/.test(url);
    const body = isMembers ? membersBody : { success: true, data: [] };
    const status = isMembers && membersStatus ? membersStatus : 200;
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  });
});
afterEach(() => { global.fetch = originalFetch; membersStatus = 0; });

function renderList() {
  const router = createMemoryRouter(
    createRoutesFromElements(<Route path="/communities" element={<MainCommunity />} />),
    { initialEntries: ["/communities?tab=all"] }
  );
  return render(
    <Provider store={makeStore({ auth: { userInfo: { user: { _id: "u1", native_language: "English", language_to_learn: "Korean" }, token: "t" } } } as any)}>
      <RouterProvider router={router} />
    </Provider>
  );
}

// An exactly-full LAST page used to read as "there is more": a phantom
// "load more" and one extra request for an empty page. The server says how many
// pages there are; the list believes it.
it("stops when the server says this full page is the last", async () => {
  membersBody = { success: true, total: PAGE_LIMIT, pages: 1, data: page };
  renderList();
  await waitFor(() => expect(screen.getAllByTestId("member-card-root")).toHaveLength(PAGE_LIMIT));
  expect(screen.queryByTestId("community-sentinel")).not.toBeInTheDocument();
});

it("offers more when the server says there are more pages", async () => {
  membersBody = { success: true, total: 45, pages: 3, data: page };
  renderList();
  await waitFor(() => expect(screen.getAllByTestId("member-card-root")).toHaveLength(PAGE_LIMIT));
  expect(screen.getByTestId("community-sentinel")).toBeInTheDocument();
});

it("falls back to the full-page rule when the response carries no page count", async () => {
  membersBody = { success: true, data: page };
  renderList();
  await waitFor(() => expect(screen.getAllByTestId("member-card-root")).toHaveLength(PAGE_LIMIT));
  expect(screen.getByTestId("community-sentinel")).toBeInTheDocument();
});

// Audit 2026-10-30: an error replaced the whole page (no sub-nav, so no way
// to switch tab or drop the filter that failed).
it("a failed first page shows the error under the sub-nav", async () => {
  membersStatus = 500;
  membersBody = { success: false, error: "boom" };
  renderList();
  await waitFor(() => expect(screen.getByText("communityMain.errors.tryAgain")).toBeInTheDocument());
  expect(screen.getAllByRole("tablist").length).toBeGreaterThan(0);
});

// Audit 2026-10-30: a client re-sort (VIP, then online) overrode the server's
// order and made cards jump as pages arrived.
it("cards keep the server's order", async () => {
  membersBody = {
    success: true, total: 2, pages: 1,
    data: [
      { _id: "a", name: "Plain", native_language: "Korean", language_to_learn: "English", imageUrls: [] },
      { _id: "b", name: "Vip", isVIP: true, isOnline: true, native_language: "Korean", language_to_learn: "English", imageUrls: [] },
    ],
  };
  renderList();
  await waitFor(() => expect(screen.getAllByTestId("member-card-root")).toHaveLength(2));
  const names = screen.getAllByTestId("member-card-root").map((n) => n.textContent || "");
  expect(names[0]).toContain("Plain");
});

// Audit 2026-10-30: the "Pro" carousel was padded with non-VIP members, so it
// repeated the grid under a heading that was not true.
it("shows no Pro carousel when nobody on the page is VIP", async () => {
  membersBody = { success: true, total: PAGE_LIMIT, pages: 1, data: page };
  const { container } = renderList();
  await waitFor(() => expect(screen.getAllByTestId("member-card-root")).toHaveLength(PAGE_LIMIT));
  expect(container.querySelector(".community-highlights")).toBeNull();
});
