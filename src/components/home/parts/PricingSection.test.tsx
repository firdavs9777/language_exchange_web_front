import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PricingSection from "./PricingSection";
import { FALLBACK_PLANS } from "../../../store/slices/plansSlice";

const mockQuery = jest.fn();
jest.mock("../../../store/slices/plansSlice", () => ({
  ...jest.requireActual("../../../store/slices/plansSlice"),
  useGetVipPlansQuery: (...args: any[]) => mockQuery(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "" }),
}));

beforeEach(() => mockQuery.mockReset());

it("renders the store's own price string, unmodified", () => {
  mockQuery.mockReturnValue({ data: FALLBACK_PLANS, isError: false, isLoading: false });
  render(<PricingSection />);
  const prices = screen.getAllByTestId("plan-price").map((n) => n.textContent);
  expect(prices).toEqual(expect.arrayContaining(["$9.99", "$23.99", "$71.99"]));
});

it("never shows the prices the old site invented", () => {
  mockQuery.mockReturnValue({ data: FALLBACK_PLANS, isError: false, isLoading: false });
  const { container } = render(<PricingSection />);
  expect(container.textContent).not.toContain("$14.99");
  expect(container.textContent).not.toContain("$49.99");
});

it("falls back to real plans when the request fails", () => {
  mockQuery.mockReturnValue({ data: undefined, isError: true, isLoading: false });
  render(<PricingSection />);
  expect(screen.getAllByTestId("plan-card").length).toBeGreaterThanOrEqual(3);
  expect(screen.getAllByTestId("plan-price").map((n) => n.textContent))
    .toEqual(expect.arrayContaining(["$9.99"]));
});

it("shows a savings badge only on plans that have one", () => {
  mockQuery.mockReturnValue({ data: FALLBACK_PLANS, isError: false, isLoading: false });
  render(<PricingSection />);
  // monthly has savings: null; quarterly 20%, yearly 40%
  expect(screen.getAllByTestId("plan-savings")).toHaveLength(2);
});

it("highlights the recommended plan", () => {
  mockQuery.mockReturnValue({ data: FALLBACK_PLANS, isError: false, isLoading: false });
  render(<PricingSection />);
  expect(screen.getAllByTestId("plan-recommended")).toHaveLength(1);
});

it("renders the free tier alongside the paid plans", () => {
  mockQuery.mockReturnValue({ data: FALLBACK_PLANS, isError: false, isLoading: false });
  render(<PricingSection />);
  expect(screen.getAllByTestId("plan-card")).toHaveLength(4);
});
