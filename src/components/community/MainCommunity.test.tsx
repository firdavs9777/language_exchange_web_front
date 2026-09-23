import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { makeStore } from "../../store";
import MainCommunity from "./MainCommunity";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  // MemberCard and the sub-nav pull the Trans component in indirectly; a
  // passthrough keeps this test about the auth split, not about copy.
  Trans: ({ children }: any) => children || null,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// The public page is exercised by its own suite; here it only needs to be
// identifiable, and stubbing it keeps its RTK Query hook out of this test.
jest.mock("./PublicCommunities", () => ({
  __esModule: true,
  default: () => <div data-testid="public-communities" />,
}));

const originalFetch = global.fetch;
beforeEach(() => {
  (global as any).fetch = jest.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
  );
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function renderWith(preloadedState?: any) {
  return render(
    <Provider store={makeStore(preloadedState)}>
      <MemoryRouter initialEntries={["/communities"]}>
        <MainCommunity />
      </MemoryRouter>
    </Provider>
  );
}

const SIGNED_IN = {
  auth: { userInfo: { user: { _id: "u1", name: "Me" }, token: "t" } },
};

// /communities is an indexed, prerendered page now: a logged-out visitor (and
// a crawler) must get the public page, not a redirect to /login.
it("gives a logged-out visitor the public communities page", () => {
  renderWith({ auth: { userInfo: null } });
  expect(screen.getByTestId("public-communities")).toBeInTheDocument();
});

it("keeps the member-discovery page for a signed-in member", () => {
  const { container } = renderWith(SIGNED_IN);
  expect(screen.queryByTestId("public-communities")).not.toBeInTheDocument();
  expect(container.querySelector(".community-page")).toBeInTheDocument();
});

// The discovery hooks (members, topics, visitors) must not fire for someone
// who is not signed in -- every one of them is an authenticated route.
it("issues no authenticated requests for a logged-out visitor", () => {
  renderWith({ auth: { userInfo: null } });
  expect(global.fetch).not.toHaveBeenCalled();
});
