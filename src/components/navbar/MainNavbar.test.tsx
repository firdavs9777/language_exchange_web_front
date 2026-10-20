import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { apiSlice } from "../../store/slices/apiSlice";
import MainNavbar from "./MainNavbar";
import { CONVERSATIONS_PAGE } from "../chat/lib/conversationMatch";
import { mockAppConfig, ALL_WEB_FLAGS_OFF, ALL_WEB_FLAGS_ON } from "../../utils/testing/mockWebFlags";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en", changeLanguage: jest.fn() } }),
}));
jest.mock("../../store/slices/appConfigSlice", () => require("../../utils/testing/mockWebFlags").appConfigSliceMock());

// Every web flag off is today's navbar; cases that need one on say so.
beforeEach(() => mockAppConfig(ALL_WEB_FLAGS_OFF));

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
};

jest.mock("../chat/hooks/useSocket", () => ({
  useSocket: () => ({ socket: mockSocket, isConnected: true, emit: jest.fn() }),
}));

function makeStore(user: any = { _id: "me", name: "Me" }) {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (state: any = { userInfo: user ? { user } : null }) => state,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

function mockConversationsFetch(conversations: any[]) {
  (global as any).fetch = jest.fn(async () =>
    new Response(JSON.stringify({ data: conversations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function renderNavbar(user?: any, path = "/") {
  return render(
    <Provider store={user === null ? makeStore(null) : user ? makeStore(user) : makeStore()}>
      <MemoryRouter initialEntries={[path]}>
        <MainNavbar />
      </MemoryRouter>
    </Provider>
  );
}

it("shows no unread badge when every conversation is read", async () => {
  mockConversationsFetch([
    { _id: "c1", unreadCount: 0 },
    { _id: "c2", unreadCount: 0 },
  ]);
  renderNavbar();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.queryByTestId("chat-unread-badge")).not.toBeInTheDocument();
});

it("sums unread counts across conversations into the navbar badge", async () => {
  mockConversationsFetch([
    { _id: "c1", unreadCount: 2 },
    { _id: "c2", unreadCount: 3 },
  ]);
  renderNavbar();
  await waitFor(() => expect(screen.getByTestId("chat-unread-badge")).toBeInTheDocument());
  expect(screen.getByTestId("chat-unread-badge")).toHaveTextContent("5");
});

it("caps the displayed badge at 99+", async () => {
  mockConversationsFetch([{ _id: "c1", unreadCount: 150 }]);
  renderNavbar();
  await waitFor(() => expect(screen.getByTestId("chat-unread-badge")).toBeInTheDocument());
  expect(screen.getByTestId("chat-unread-badge")).toHaveTextContent("99+");
});

// The console is the only surface in the app gated on role, so the navbar
// entry is the guard users actually see. It lives in the account menu, which
// desktop and phone share.
const adminLinks = () =>
  Array.from(document.querySelectorAll('a[href="/admin"]'));

it("shows the Admin entry to an admin, in the account menu", async () => {
  mockConversationsFetch([]);
  renderNavbar({ _id: "me", name: "Me", role: "admin" });
  expect(adminLinks()).toHaveLength(1);
  fireEvent.click(screen.getByTestId("nav-account-trigger"));
  expect(screen.getByRole("link", { name: /admin\.nav\.admin/ })).toHaveAttribute("href", "/admin");
});

it("hides the Admin entry from a non-admin", async () => {
  mockConversationsFetch([]);
  renderNavbar({ _id: "me", name: "Me", role: "user" });
  fireEvent.click(screen.getByTestId("nav-account-trigger"));
  expect(screen.getByRole("link", { name: /nav\.followersFollowing/ })).toBeInTheDocument();
  expect(adminLinks()).toHaveLength(0);
});

// --- One cache entry, and every event that changes it ----------------------
//
// The badge and the chat sidebar read the same list. Asking for it with a
// different literal than UsersList does gives RTK Query a different cache key,
// which means two identical requests and, worse, two copies that go stale
// independently: UsersList could refetch after a read while the navbar's copy
// kept the old counts.

it("asks for the conversations with the argument the chat list shares", async () => {
  mockConversationsFetch([]);
  renderNavbar();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  const asked = (global.fetch as jest.Mock).mock.calls[0][0];
  const url = typeof asked === "string" ? asked : asked.url;
  expect(url).toContain(`limit=${CONVERSATIONS_PAGE.limit}`);
  expect(url).toContain(`page=${CONVERSATIONS_PAGE.page}`);
});

it("refreshes the badge on the events that change it, sending included", async () => {
  mockConversationsFetch([]);
  renderNavbar();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  const listened = mockSocket.on.mock.calls.map((c: any[]) => c[0]);
  // `messageSent` is what a sent message looks like from the sender's side --
  // the row order and the last message change even when no count does.
  expect(listened).toEqual(
    expect.arrayContaining([
      "newMessage",
      "newVoiceMessage",
      "newVideoMessage",
      "messagesRead",
      "messageSent",
    ])
  );
});

it("has no Reels entry while webReelsEnabled is off", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_OFF);
  const { container } = renderNavbar();
  expect(container.querySelector('a[href="/reels"]')).toBe(null);
});

it("shows Reels in the desktop and mobile menus once the flag is on", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_ON);
  const { container } = renderNavbar();
  expect(container.querySelectorAll('a[href="/reels"]').length).toBeGreaterThanOrEqual(1);
});

it("has no Gatherings entry while webGatheringsEnabled is off", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_OFF);
  const { container } = renderNavbar();
  expect(container.querySelector('a[href="/gatherings"]')).toBe(null);
});

it("shows Gatherings in the navbar once the flag is on", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_ON);
  const { container } = renderNavbar();
  expect(container.querySelectorAll('a[href="/gatherings"]').length).toBeGreaterThanOrEqual(1);
});

// --- Layout -----------------------------------------------------------------

it("folds the flagged-off entries out of the Community menu", () => {
  mockConversationsFetch([]);
  mockAppConfig({ ...ALL_WEB_FLAGS_OFF, webGatheringsEnabled: true });
  const { container } = renderNavbar();
  fireEvent.click(screen.getByTestId("nav-community-trigger"));
  const panel = document.getElementById("nav-community-panel")!;
  const hrefs = Array.from(panel.querySelectorAll("a")).map((a) => a.getAttribute("href"));
  expect(hrefs).toEqual(["/communities", "/gatherings"]);
  expect(container.querySelector('a[href="/voice-rooms"]')).toBe(null);
  expect(container.querySelector('a[href="/rooms"]')).toBe(null);
});

it("turns a menu with a single visible entry into a plain link", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_OFF);
  renderNavbar();
  expect(screen.queryByTestId("nav-community-trigger")).not.toBeInTheDocument();
  const link = screen.getByTestId("nav-community-link");
  expect(link.tagName).toBe("A");
  expect(link).toHaveAttribute("href", "/communities");
  // Moments always has Feed + My moments, so it stays a menu.
  expect(screen.getByTestId("nav-moments-trigger")).toHaveAttribute("aria-haspopup", "true");
});

it("lights the parent section when a child route is active", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_ON);
  renderNavbar(undefined, "/gatherings/g1");
  expect(screen.getByTestId("nav-community-trigger")).toHaveClass("active");
  expect(screen.getByTestId("nav-moments-trigger")).not.toHaveClass("active");
  expect(screen.getByTestId("bottom-tab-community")).toHaveClass("active");
});

it("opens with Enter/Space/ArrowDown and closes with Escape, handing focus back", () => {
  mockConversationsFetch([]);
  mockAppConfig(ALL_WEB_FLAGS_ON);
  renderNavbar();
  const trigger = screen.getByTestId("nav-moments-trigger");
  const panel = document.getElementById("nav-moments-panel")!;
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(panel).not.toBeVisible();

  // A native <button> turns Enter and Space into a click.
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(panel).toBeVisible();

  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(document.activeElement).toBe(trigger);

  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(document.activeElement).toHaveAttribute("href", "/moments");
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(document.activeElement).toHaveAttribute("href", "/reels");
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(document.activeElement).toBe(trigger);
});

it("closes an open menu on a click outside it", () => {
  mockConversationsFetch([]);
  renderNavbar();
  const trigger = screen.getByTestId("nav-account-trigger");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  fireEvent.mouseDown(document.body);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

it("shows a visitor Features, Download app, Log in and Sign up — and no tabs", () => {
  mockAppConfig(ALL_WEB_FLAGS_ON);
  renderNavbar(null);
  expect(screen.getByRole("link", { name: "sign_in" })).toHaveAttribute("href", "/login");
  expect(screen.getByRole("link", { name: "nav.signUp" })).toHaveAttribute("href", "/register");
  expect(screen.getByRole("link", { name: "nav.downloadApp" })).toHaveAttribute("href", "/download");
  expect(screen.getByRole("link", { name: "nav.features" })).toBeInTheDocument();
  expect(screen.queryByTestId("bottom-tabs")).not.toBeInTheDocument();
  expect(screen.queryByTestId("nav-account-trigger")).not.toBeInTheDocument();
  expect(document.querySelector('a[href="/chat"]')).toBe(null);
  expect(document.body).not.toHaveClass("has-bottom-tabs");
});

it("renders the phone tab bar with the unread badge on Chats", async () => {
  mockConversationsFetch([{ _id: "c1", unreadCount: 4 }]);
  renderNavbar();
  const bar = screen.getByTestId("bottom-tabs");
  const tabs = Array.from(bar.querySelectorAll("a")).map((a) => a.getAttribute("href"));
  // Learn is left out until the web has a learning surface (/courses is a stub).
  expect(tabs).toEqual(["/learn", "/communities", "/chat", "/moments", "/profile"]);
  await waitFor(() => expect(screen.getByTestId("chat-unread-badge-mobile")).toHaveTextContent("4"));
  expect(screen.getByTestId("bottom-tab-chats")).toContainElement(screen.getByTestId("chat-unread-badge-mobile"));
  expect(document.body).toHaveClass("has-bottom-tabs");
});

it("hides the tab bar inside a conversation, which owns the bottom edge", () => {
  mockConversationsFetch([]);
  renderNavbar(undefined, "/chat/u2");
  expect(screen.queryByTestId("bottom-tabs")).not.toBeInTheDocument();
  expect(document.body).not.toHaveClass("has-bottom-tabs");
});

it("keeps the tab bar on the conversation list", () => {
  mockConversationsFetch([]);
  renderNavbar(undefined, "/chat");
  expect(screen.getByTestId("bottom-tab-chats")).toHaveClass("active");
});

describe("Features link (NAV-2)", () => {
  const { createMemoryRouter, RouterProvider, ScrollRestoration, Outlet } = require("react-router-dom");
  // jsdom has no window.scrollTo; <ScrollRestoration> calls it on every navigation.
  beforeEach(() => jest.spyOn(window, "scrollTo").mockImplementation(() => {}));
  afterEach(() => (window.scrollTo as jest.Mock).mockRestore());

  function renderAt(path: string) {
    const scrolled = jest.fn();
    const Home = () => (
      <section id="features" data-testid="features-target" ref={(el) => { if (el) (el as any).scrollIntoView = scrolled; }} />
    );
    const Shell = () => (
      <>
        <MainNavbar />
        <Outlet />
        <ScrollRestoration />
      </>
    );
    const router = createMemoryRouter(
      [{ path: "/", element: <Shell />, children: [{ index: true, element: <Home /> }, { path: "moments", element: <div /> }] }],
      { initialEntries: [path] }
    );
    render(
      <Provider store={makeStore(null)}>
        <RouterProvider router={router} />
      </Provider>
    );
    return { router, scrolled };
  }

  it("points at /#features", () => {
    renderNavbar(null, "/moments");
    expect(screen.getByRole("link", { name: "nav.features" })).toHaveAttribute("href", "/#features");
  });

  it("from another page, goes to the homepage and scrolls to the feature section", async () => {
    const { router, scrolled } = renderAt("/moments");
    fireEvent.click(screen.getByRole("link", { name: "nav.features" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(router.state.location.hash).toBe("#features");
    await waitFor(() => expect(scrolled).toHaveBeenCalled());
  });

  it("on the homepage, scrolls smoothly without navigating", () => {
    const { router, scrolled } = renderAt("/");
    const before = router.state.location.key;
    fireEvent.click(screen.getByRole("link", { name: "nav.features" }));
    expect(scrolled).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(router.state.location.key).toBe(before);
  });
});
