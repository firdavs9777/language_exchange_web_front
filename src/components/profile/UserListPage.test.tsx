import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import UserListPage from "./UserListPage";

const mockGetFollowers = jest.fn();
const mockGetFollowings = jest.fn();
const mockGetVisitors = jest.fn();
const mockGetVipStatus = jest.fn();
const mockGetCommunityDetails = jest.fn();
const mockFollow = jest.fn();
const mockUnfollow = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../store/slices/usersSlice", () => ({
  useGetFollowersQuery: (arg: any, opts: any) => mockGetFollowers(arg, opts),
  useGetFollowingsQuery: (arg: any, opts: any) => mockGetFollowings(arg, opts),
  useGetProfileVisitorsQuery: (arg: any, opts: any) =>
    mockGetVisitors(arg, opts),
  useGetVipStatusQuery: (arg: any, opts: any) => mockGetVipStatus(arg, opts),
  useFollowUserMutation: () => [mockFollow, { isLoading: false }],
  useUnFollowUserMutation: () => [mockUnfollow, { isLoading: false }],
}));

jest.mock("../../store/slices/communitySlice", () => ({
  useGetCommunityDetailsQuery: (arg: any, opts: any) =>
    mockGetCommunityDetails(arg, opts),
}));

const followersRefetch = jest.fn();
const followingsRefetch = jest.fn();
const visitorsRefetch = jest.fn();

const idle = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: undefined,
};
const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });
const rejected = () => ({ unwrap: () => Promise.reject(new Error("nope")) });

function person(id: string, name: string, extra: any = {}) {
  return {
    _id: id,
    name,
    imageUrls: [],
    native_language: "Korean",
    language_to_learn: "English",
    ...extra,
  };
}

function renderList(path: string, viewerId: string | null = "me") {
  const store = configureStore({
    reducer: {
      auth: (
        state: any = {
          userInfo: viewerId ? { user: { _id: viewerId } } : null,
        },
      ) => state,
    },
  });
  return render(
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/followersList" element={<UserListPage />} />
            <Route path="/followingsList" element={<UserListPage />} />
            <Route path="/visitors" element={<UserListPage />} />
            <Route
              path="/profile/:userId/followers"
              element={<UserListPage />}
            />
            <Route
              path="/profile/:userId/following"
              element={<UserListPage />}
            />
            <Route path="/login" element={<div data-testid="login-screen" />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>,
  );
}

beforeEach(() => {
  mockGetFollowers.mockReturnValue({ ...idle, refetch: followersRefetch });
  mockGetFollowings.mockReturnValue({ ...idle, refetch: followingsRefetch });
  mockGetVisitors.mockReturnValue({ ...idle, refetch: visitorsRefetch });
  mockGetVipStatus.mockReturnValue({ ...idle });
  mockGetCommunityDetails.mockReturnValue({ ...idle });
  mockFollow.mockReturnValue(resolved());
  mockUnfollow.mockReturnValue(resolved());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("tabs", () => {
  it("selects Followers on /followersList and asks only for that list", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada")] },
    });

    renderList("/followersList", "me");

    expect(screen.getByTestId("tab-followers")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("tab-followers")).toHaveAttribute(
      "href",
      "/followersList",
    );
    expect(mockGetFollowers.mock.calls[0][0]).toEqual({ userId: "me" });
    expect(mockGetFollowers.mock.calls[0][1].skip).toBe(false);
    // The other two lists are not fetched until their tab is open.
    expect(mockGetVisitors.mock.calls[0][1].skip).toBe(true);
  });

  it("selects Following on /followingsList", () => {
    renderList("/followingsList", "me");

    expect(screen.getByTestId("tab-following")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(mockGetFollowers.mock.calls[0][1].skip).toBe(true);
    const forOwner = mockGetFollowings.mock.calls.filter(
      (call: any[]) => !call[1].skip,
    );
    expect(forOwner.length).toBeGreaterThan(0);
  });

  it("selects Visitors on /visitors", () => {
    mockGetVipStatus.mockReturnValue({
      ...idle,
      data: { data: { isActive: true } },
    });

    renderList("/visitors", "me");

    expect(screen.getByTestId("tab-visitors")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(mockGetVisitors.mock.calls[0][1].skip).toBe(false);
  });

  it("offers no Visitors tab on another person's lists, and names them", () => {
    mockGetCommunityDetails.mockReturnValue({
      ...idle,
      data: { data: { _id: "u9", name: "Ada" } },
    });

    renderList("/profile/u9/followers", "me");

    expect(screen.queryByTestId("tab-visitors")).not.toBeInTheDocument();
    expect(screen.getByTestId("tab-followers")).toHaveAttribute(
      "href",
      "/profile/u9/followers",
    );
    expect(screen.getByTestId("tab-following")).toHaveAttribute(
      "href",
      "/profile/u9/following",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ada");
    // Another person's list, so their id -- not the viewer's -- is fetched.
    expect(mockGetFollowers.mock.calls[0][0]).toEqual({ userId: "u9" });
  });
});

it("lets the tab bar scroll instead of widening the page on a phone", () => {
  renderList("/visitors", "me");
  const nav = screen.getByTestId("list-tabs");
  expect(nav.className).toContain("overflow-x-auto");
  // A tab that can shrink wraps its label and pushes the row wider instead.
  expect(screen.getByTestId("tab-visitors").className).toContain("shrink-0");
  expect(screen.getByTestId("tab-visitors").className).toContain("whitespace-nowrap");
});

describe("rows", () => {
  it("links each person to their profile and shows their language pair", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 2, data: [person("u2", "Ada"), person("u3", "Grace")] },
    });

    renderList("/followersList", "me");

    expect(screen.getByTestId("list-row-u2")).toBeInTheDocument();
    expect(screen.getByTestId("list-name-u2")).toHaveAttribute(
      "href",
      "/profile/u2",
    );
    expect(screen.getAllByTestId("language-pill").length).toBe(2);
    // No photo on either person: initials, never a broken image.
    expect(screen.getAllByTestId("avatar-initials").length).toBe(2);
  });

  // `aria-hidden` on something that can still be focused or clicked is a WCAG
  // 4.1.2 violation. The avatar link stays in the accessibility tree and out of
  // the tab order instead.
  it("keeps the avatar link out of the tab order without hiding it", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada")] },
    });

    renderList("/followersList", "me");
    const row = screen.getByTestId("list-row-u2");
    const links = row.querySelectorAll('a[href="/profile/u2"]');
    expect(links.length).toBe(2);
    links.forEach((link) => expect(link).not.toHaveAttribute("aria-hidden"));
    expect(links[0]).toHaveAttribute("tabindex", "-1");
    expect(screen.getByTestId("list-name-u2")).not.toHaveAttribute("tabindex");
  });

  // The followers/following/visitors populate does not select `languageLevel`,
  // so the rows must not pretend to know it: the pill renders its language
  // pair without CEFR dots.
  it("draws no CEFR dots on a list row", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada", { languageLevel: "C1" })] },
    });

    renderList("/followersList", "me");
    expect(screen.getByTestId("language-pill")).toBeInTheDocument();
    expect(screen.queryAllByTestId("language-pill-dot")).toHaveLength(0);
  });

  it("gives the viewer's own row no follow button", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 2, data: [person("me", "Me"), person("u2", "Ada")] },
    });

    renderList("/followersList", "me");

    expect(screen.queryByTestId("list-follow-me")).not.toBeInTheDocument();
    expect(screen.getByTestId("list-follow-u2")).toBeInTheDocument();
  });

  it("reads the follow state from the viewer's own following list", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 2, data: [person("u2", "Ada"), person("u3", "Grace")] },
    });
    mockGetFollowings.mockReturnValue({
      ...idle,
      refetch: followingsRefetch,
      data: { count: 1, data: [person("u3", "Grace")] },
    });

    renderList("/followersList", "me");

    expect(screen.getByTestId("list-follow-u2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("list-follow-u3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("follows optimistically and rolls back when the server refuses", async () => {
    mockFollow.mockReturnValue(rejected());
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada")] },
    });

    renderList("/followersList", "me");

    fireEvent.click(screen.getByTestId("list-follow-u2"));
    expect(mockFollow).toHaveBeenCalledWith({
      userId: "me",
      targetUserId: "u2",
    });
    expect(screen.getByTestId("list-follow-u2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await waitFor(() =>
      expect(screen.getByTestId("list-follow-u2")).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
  });
});

describe("search", () => {
  it("filters the list by name without asking the server again", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 2, data: [person("u2", "Ada"), person("u3", "Grace")] },
    });

    renderList("/followersList", "me");
    const callsBefore = mockGetFollowers.mock.calls.length;

    fireEvent.change(screen.getByTestId("list-search"), {
      target: { value: "gra" },
    });

    expect(screen.queryByTestId("list-row-u2")).not.toBeInTheDocument();
    expect(screen.getByTestId("list-row-u3")).toBeInTheDocument();
    expect(mockGetFollowers.mock.calls.length).toBeGreaterThanOrEqual(
      callsBefore,
    );
    expect(
      mockGetFollowers.mock.calls[mockGetFollowers.mock.calls.length - 1][0],
    ).toEqual({
      userId: "me",
    });
  });

  // The heading counter sits next to the list it counts; with a filter active
  // the unfiltered total contradicts the rows on screen.
  it("counts what the list actually shows while a search is active", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 2, data: [person("u2", "Ada"), person("u3", "Grace")] },
    });

    renderList("/followersList", "me");
    expect(screen.getByTestId("list-count")).toHaveTextContent("2");

    fireEvent.change(screen.getByTestId("list-search"), {
      target: { value: "gra" },
    });
    expect(screen.getByTestId("list-count")).toHaveTextContent("1");
  });

  it("says so when the search matches nobody, without claiming the list is empty", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada")] },
    });

    renderList("/followersList", "me");
    fireEvent.change(screen.getByTestId("list-search"), {
      target: { value: "zzz" },
    });

    expect(screen.getByTestId("list-search-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("list-empty")).not.toBeInTheDocument();
  });
});

describe("states", () => {
  it("shows skeleton rows while the list loads", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      isLoading: true,
    });

    renderList("/followersList", "me");

    expect(screen.getByTestId("list-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("list-empty")).not.toBeInTheDocument();
  });

  it("offers a retry that refetches the open tab", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      error: { status: 500 },
    });

    renderList("/followersList", "me");

    expect(screen.getByTestId("list-error")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("list-retry"));
    expect(followersRefetch).toHaveBeenCalled();
  });

  it("has an empty state of its own per tab", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 0, data: [] },
    });

    const { unmount } = renderList("/followersList", "me");
    const followersCopy = screen.getByTestId("list-empty").textContent;
    unmount();

    mockGetFollowings.mockReturnValue({
      ...idle,
      refetch: followingsRefetch,
      data: { count: 0, data: [] },
    });
    renderList("/followingsList", "me");

    expect(screen.getByTestId("list-empty").textContent).not.toBe(
      followersCopy,
    );
  });
});

describe("visitors", () => {
  it("locks the tab for a free account and points at the VIP page", () => {
    renderList("/visitors", "me");

    expect(screen.getByTestId("visitors-locked")).toBeInTheDocument();
    expect(screen.getByTestId("visitors-vip-link")).toHaveAttribute(
      "href",
      "/settings/vip",
    );
    // Nothing is fetched for a list the viewer may not see.
    expect(mockGetVisitors.mock.calls[0][1].skip).toBe(true);
  });

  it("lists the visitors for a VIP account", () => {
    mockGetVipStatus.mockReturnValue({
      ...idle,
      data: { data: { isActive: true } },
    });
    mockGetVisitors.mockReturnValue({
      ...idle,
      refetch: visitorsRefetch,
      data: {
        count: 1,
        data: [
          {
            user: person("u5", "Lin"),
            lastVisit: new Date().toISOString(),
            visitCount: 2,
            source: "search",
          },
        ],
      },
    });

    renderList("/visitors", "me");

    expect(screen.queryByTestId("visitors-locked")).not.toBeInTheDocument();
    expect(screen.getByTestId("list-row-u5")).toBeInTheDocument();
    expect(screen.getByTestId("list-name-u5")).toHaveAttribute(
      "href",
      "/profile/u5",
    );
  });

  it("shows the counters the endpoint sent, and only those", () => {
    mockGetVipStatus.mockReturnValue({ ...idle, data: { data: { isActive: true } } });
    mockGetVisitors.mockReturnValue({
      ...idle,
      refetch: visitorsRefetch,
      data: {
        data: [{ user: person("u5", "Lin"), lastVisit: new Date().toISOString() }],
        // visitsThisWeek absent on purpose: an omitted field gets no tile.
        stats: { totalVisits: 42, uniqueVisitors: 17, visitsToday: 3 },
      },
    });

    renderList("/visitors", "me");

    expect(screen.getByTestId("visitor-stat-totalVisits")).toHaveTextContent("42");
    expect(screen.getByTestId("visitor-stat-uniqueVisitors")).toHaveTextContent("17");
    expect(screen.getByTestId("visitor-stat-visitsToday")).toHaveTextContent("3");
    expect(screen.queryByTestId("visitor-stat-visitsThisWeek")).not.toBeInTheDocument();
  });

  it("renders no stats row when the response carries no stats", () => {
    mockGetVipStatus.mockReturnValue({ ...idle, data: { data: { isActive: true } } });
    mockGetVisitors.mockReturnValue({
      ...idle,
      refetch: visitorsRefetch,
      data: { data: [{ user: person("u5", "Lin") }] },
    });

    renderList("/visitors", "me");

    expect(screen.queryByTestId("visitor-stats")).not.toBeInTheDocument();
  });

  it("keeps the stats row off the followers and following tabs", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { data: [person("u5", "Lin")], stats: { totalVisits: 42 } },
    });

    renderList("/followersList", "me");

    expect(screen.queryByTestId("visitor-stats")).not.toBeInTheDocument();
  });
});

describe("signed out", () => {
  it("sends a visitor with no session to the login page", () => {
    renderList("/followersList", null);

    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
  });

  it("still renders another person's list for a signed-out visitor", () => {
    mockGetFollowers.mockReturnValue({
      ...idle,
      refetch: followersRefetch,
      data: { count: 1, data: [person("u2", "Ada")] },
    });

    renderList("/profile/u9/followers", null);

    expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("list-row-u2")).toBeInTheDocument();
    // Nobody to follow as: no button rather than one that bounces to login.
    expect(screen.queryByTestId("list-follow-u2")).not.toBeInTheDocument();
  });
});
