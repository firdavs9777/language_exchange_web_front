import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import FeatureShowcase from "./FeatureShowcase";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

it("renders a card per feature", () => {
  render(<FeatureShowcase />);
  expect(screen.getAllByTestId("feature-card").length).toBeGreaterThanOrEqual(6);
});

it("marks the mobile-only features so the install promise is honest", () => {
  render(<FeatureShowcase />);
  expect(screen.getAllByTestId("feature-mobile-only").length).toBeGreaterThanOrEqual(1);
});

it("does not mark every feature mobile-only", () => {
  render(<FeatureShowcase />);
  const all = screen.getAllByTestId("feature-card").length;
  const mobile = screen.getAllByTestId("feature-mobile-only").length;
  expect(mobile).toBeLessThan(all);
});
