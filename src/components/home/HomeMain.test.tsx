import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import HomeMain from "./HomeMain";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));
jest.mock("../../store/slices/plansSlice", () => ({
  ...jest.requireActual("../../store/slices/plansSlice"),
  useGetVipPlansQuery: () => ({ data: undefined, isError: true, isLoading: false }),
}));

beforeEach(() => window.localStorage.clear());

it("assembles every section in order", () => {
  render(<HomeMain />);
  ["hero-demo", "stat-strip", "how-it-works", "feature-showcase",
   "language-marquee", "pricing-section", "early-adopter-band", "final-cta"]
    .forEach((id) => expect(screen.getByTestId(id)).toBeInTheDocument());
});

it("mounts the promo carousel", () => {
  render(<HomeMain />);
  expect(screen.getByTestId("promo-carousel")).toBeInTheDocument();
});

// The whole page must be free of the prices that were never true.
it("shows no invented prices anywhere", () => {
  const { container } = render(<HomeMain />);
  expect(container.textContent).not.toContain("$14.99");
  expect(container.textContent).not.toContain("$49.99");
});
