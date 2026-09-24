import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import {
  createMemoryRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { makeStore } from "../../store";
import MainCommunity from "./MainCommunity";

// `t` returns the key: these tests are about which request is made and what is
// on the page, never about the wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    // The key, plus whatever was interpolated into it -- enough to assert that
    // the reasons the server sent reach the page, without asserting on copy.
    t: (key: string, options?: Record<string, any>) =>
      options
        ? `${key} ${Object.keys(options)
            .map((name) => options[name])
            .join(" ")}`
        : key,
  }),
  Trans: ({ children }: any) => children || null,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

jest.mock("./PublicCommunities", () => ({
  __esModule: true,
  default: () => <div data-testid="public-communities" />,
}));

jest.mock("../../design/notify", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    show: jest.fn(),
    dismiss: jest.fn(),
  },
}));

const member = (n: number) => ({
  _id: `m${n}`,
  name: `Member ${n}`,
  native_language: "Korean",
  language_to_learn: "English",
  imageUrls: [],
});

/** What the recommendation feed answers with, reset per test. */
let recommendations: any[] = [];
const requestedUrls: string[] = [];
const originalFetch = global.fetch;

beforeEach(() => {
  requestedUrls.length = 0;
  recommendations = [
    {
      ...member(1),
      matchReasons: ["Native Korean speaker", "Online now"],
      matchScore: 91,
    },
    { ...member(2), matchReasons: [] },
  ];
  window.localStorage.clear();
  (global as any).fetch = jest.fn((input: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    requestedUrls.push(url);
    let body: any = { success: true, data: [] };
    if (url.indexOf("/matching/recommendations") >= 0) {
      body = { success: true, count: recommendations.length, data: recommendations, cached: false };
    } else if (url.indexOf("/count") >= 0) {
      body = { success: true, data: { count: 7 } };
    } else if (url.indexOf("/visitors") >= 0) {
      body = {
        success: true,
        totalCount: 3,
        data: [{ _id: "v1", name: "Vera", imageUrls: [] }],
      };
    } else if (url.indexOf("/auth/users") >= 0) {
      body = { success: true, data: [member(1), member(2), member(3)] };
    }
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

const SIGNED_IN = {
  auth: {
    userInfo: {
      user: { _id: "u1", name: "Me", native_language: "English", language_to_learn: "Korean" },
      token: "t",
    },
  },
};

function renderList(entries: string[] = ["/communities"]) {
  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route path="/">
        <Route path="communities" element={<MainCommunity />} />
        <Route path="community/nearby" element={<div data-testid="nearby-screen" />} />
        <Route path="topics" element={<div data-testid="topics-screen" />} />
        <Route path="profile/edit" element={<div data-testid="edit-profile-screen" />} />
      </Route>
    ),
    { initialEntries: entries }
  );
  const utils = render(
    <Provider store={makeStore(SIGNED_IN)}>
      <RouterProvider router={router} />
    </Provider>
  );
  return { ...utils, router };
}

const memberRequests = () => requestedUrls.filter((u) => /\/auth\/users\?/.test(u));
const recommendationRequests = () =>
  requestedUrls.filter((u) => u.indexOf("/matching/recommendations") >= 0);

const tab = (name: string) => screen.getByRole("tab", { name });

describe("the community tabs", () => {
  it("puts the chosen tab in the URL", async () => {
    const { router } = renderList();
    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));

    fireEvent.click(tab("communityMain.tabs.online"));
    await waitFor(() => expect(router.state.location.search).toBe("?tab=online"));

    fireEvent.click(tab("communityMain.tabs.new"));
    await waitFor(() => expect(router.state.location.search).toBe("?tab=new"));

    // `all` is the default: it is normalised back out of the query.
    fireEvent.click(tab("communityMain.tabs.all"));
    await waitFor(() => expect(router.state.location.search).toBe(""));
  });

  it("reads the tab back out of a pasted link", async () => {
    renderList(["/communities?tab=foryou"]);

    await waitFor(() => expect(recommendationRequests().length).toBe(1));
    expect(tab("communityMain.tabs.forYou")).toHaveAttribute("aria-selected", "true");
  });

  // The tab locks the switch; the member's own filters ride along with it.
  it("locks onlineOnly on the Online tab, keeping the other filters", async () => {
    renderList(["/communities?tab=online&gender=female"]);

    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));
    const last = memberRequests()[memberRequests().length - 1];
    expect(last).toContain("onlineOnly=true");
    expect(last).toContain("gender=female");
  });

  it("locks newUsersOnly on the New tab", async () => {
    renderList(["/communities?tab=new"]);

    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));
    expect(memberRequests()[memberRequests().length - 1]).toContain("newUsersOnly=true");
  });

  // The lock is a property of the tab, not a filter the member set: leaving
  // the tab must not leave `online=1` behind in the URL.
  it("does not write the tab's own lock into the query string", async () => {
    const { router } = renderList(["/communities?tab=online"]);

    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));
    expect(router.state.location.search).toBe("?tab=online");
  });

  it("asks the All tab for no lock at all", async () => {
    renderList(["/communities"]);

    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));
    const first = memberRequests()[0];
    expect(first).not.toContain("onlineOnly");
    expect(first).not.toContain("newUsersOnly");
  });

  it("keeps the visitors banner and the highlighted carousel on All only", async () => {
    const { container, router } = renderList();

    await waitFor(() =>
      expect(container.querySelector(".visitors-banner")).toBeInTheDocument()
    );
    expect(container.querySelector(".highlighted-banner")).toBeInTheDocument();

    fireEvent.click(tab("communityMain.tabs.online"));
    await waitFor(() => expect(router.state.location.search).toBe("?tab=online"));

    expect(container.querySelector(".visitors-banner")).not.toBeInTheDocument();
    expect(container.querySelector(".highlighted-banner")).not.toBeInTheDocument();
  });

  it("keeps the wave sheet reachable on every tab", async () => {
    renderList(["/communities?tab=foryou"]);

    const waveButtons = await screen.findAllByTestId("member-card-wave-button");
    fireEvent.click(waveButtons[0]);
    expect(await screen.findByTestId("wave-sheet")).toBeInTheDocument();
  });
});

describe("the For you tab", () => {
  it("asks the recommendation endpoint for a page of members, and the list for nothing", async () => {
    renderList(["/communities?tab=foryou"]);

    await waitFor(() => expect(recommendationRequests().length).toBe(1));
    expect(recommendationRequests()[0]).toContain("limit=20");
    expect(memberRequests()).toEqual([]);
  });

  it("costs nothing to a member who never opens it", async () => {
    renderList(["/communities"]);

    await waitFor(() => expect(memberRequests().length).toBeGreaterThan(0));
    expect(recommendationRequests()).toEqual([]);
  });

  // A recommendation nobody can see the reasoning for is just a list.
  it("prints the server's reasons under the member they belong to", async () => {
    renderList(["/communities?tab=foryou"]);

    const why = await screen.findAllByTestId("for-you-why");
    expect(why).toHaveLength(1); // the second member came back with no reasons
    expect(why[0]).toHaveTextContent("Native Korean speaker");
    expect(why[0]).toHaveTextContent("Online now");
  });

  it("offers no filter or sort control", async () => {
    renderList(["/communities?tab=foryou"]);

    await waitFor(() => expect(recommendationRequests().length).toBe(1));
    expect(screen.queryByText("communityMain.chips.onlineNow")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("communityMain.subnav.filtersLabel")
    ).not.toBeInTheDocument();
  });

  it("asks again when the member asks for something new", async () => {
    renderList(["/communities?tab=foryou"]);
    await waitFor(() => expect(recommendationRequests().length).toBe(1));

    fireEvent.click(screen.getByTestId("for-you-refresh"));
    await waitFor(() => expect(recommendationRequests().length).toBe(2));
  });

  // An empty feed is never "nobody is here": it is that we do not know enough
  // about this member yet, so the way out is their own profile.
  it("sends an empty feed to the profile editor", async () => {
    recommendations = [];
    renderList(["/communities?tab=foryou"]);

    const empty = await screen.findByTestId("for-you-empty");
    expect(empty).toBeInTheDocument();
    expect(screen.getByText("communityMain.forYou.empty.action").closest("a")).toHaveAttribute(
      "href",
      "/profile/edit"
    );
  });
});
