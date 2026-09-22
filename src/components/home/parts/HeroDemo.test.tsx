import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import HeroDemo from "./HeroDemo";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

it("renders a headline", () => {
  render(<HeroDemo />);
  expect(screen.getByTestId("hero-headline")).toBeInTheDocument();
});

it("links to both stores", () => {
  render(<HeroDemo />);
  expect(screen.getByTestId("hero-store-ios")).toHaveAttribute(
    "href", expect.stringContaining("apps.apple.com")
  );
  expect(screen.getByTestId("hero-store-android")).toHaveAttribute(
    "href", expect.stringContaining("play.google.com")
  );
});

// The mechanic is the argument: a message, its translation, and a correction.
it("shows the exchange, its translation and a tutor correction", () => {
  render(<HeroDemo />);
  expect(screen.getAllByTestId("demo-message").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByTestId("demo-tutor-note")).toBeInTheDocument();
});

// Content must never depend on an animation having run.
it("renders all content immediately, animation aside", () => {
  render(<HeroDemo />);
  const text = screen.getByTestId("hero-demo").textContent || "";
  expect(text).toContain("안녕하세요");
  expect(text).toContain("Do you have time today?");
});
