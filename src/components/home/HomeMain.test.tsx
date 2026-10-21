import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import HomeMain from "./HomeMain";

// The page embeds an AdUnit, which reads the signed-in user from the store to
// keep ads off VIP accounts, so the page needs a Provider. Only `auth` is real
// here; the data hooks are mocked below.
const renderHome = () => {
  const store = configureStore({ reducer: { auth: () => ({ userInfo: null }) } });
  return render(
    <Provider store={store}>
      <HomeMain />
    </Provider>
  );
};

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));
jest.mock("../../store/slices/plansSlice", () => ({
  ...jest.requireActual("../../store/slices/plansSlice"),
  useGetVipPlansQuery: () => ({ data: undefined, isError: true, isLoading: false }),
}));
jest.mock("../../store/slices/publicStatsSlice", () => ({
  ...jest.requireActual("../../store/slices/publicStatsSlice"),
  useGetPublicStatsQuery: () => ({ data: undefined }),
}));

beforeEach(() => window.localStorage.clear());

it("assembles every section in order", () => {
  const { container } = renderHome();
  const ids = ["home-hero", "home-steps", "home-features", "language-marquee",
    "stat-strip", "pricing-section", "home-cta"];
  const nodes = ids.map((id) => screen.getByTestId(id));
  nodes.slice(1).forEach((node, i) =>
    // DOCUMENT_POSITION_FOLLOWING: each section comes after the one before it.
    expect(nodes[i].compareDocumentPosition(node) & 4).toBeTruthy()
  );
  expect(container.querySelector("#pricing")).not.toBeNull();
});

it("has exactly one h1", () => {
  const { container } = renderHome();
  expect(container.querySelectorAll("h1")).toHaveLength(1);
});

it("offers both stores in the hero and in the closing band", () => {
  renderHome();
  ["home-hero", "home-cta"].forEach((id) => {
    const section = screen.getByTestId(id);
    expect(section.querySelector('[data-testid="store-link-ios"]')).not.toBeNull();
    expect(section.querySelector('[data-testid="store-link-android"]')).not.toBeNull();
  });
});

it("gives every screenshot alt text and lazy-loads all but the hero's front phone", () => {
  const { container } = renderHome();
  const shots = Array.from(container.querySelectorAll('img[src^="/images/app/"]'));
  expect(shots.length).toBeGreaterThanOrEqual(4);
  shots.forEach((img) => {
    expect((img.getAttribute("alt") || "").length).toBeGreaterThan(0);
    expect(img.getAttribute("width")).toBe("590");
    expect(img.getAttribute("height")).toBe("1278");
  });
  const eager = shots.filter((img) => img.getAttribute("loading") !== "lazy");
  expect(eager).toHaveLength(1);
  expect(eager[0].getAttribute("src")).toMatch(/^\/images\/app\/app-chat\.png(\?v=.+)?$/);
});

it("ends the steps, features and languages sections with a call to action", () => {
  renderHome();
  ["steps-cta", "features-cta", "languages-cta", "hero-web-cta"].forEach((id) =>
    expect(screen.getByTestId(id)).toHaveAttribute("href", "/register")
  );
});

// The whole page must be free of the prices that were never true.
it("shows no invented prices anywhere", () => {
  const { container } = renderHome();
  expect(container.textContent).not.toContain("$14.99");
  expect(container.textContent).not.toContain("$49.99");
});
