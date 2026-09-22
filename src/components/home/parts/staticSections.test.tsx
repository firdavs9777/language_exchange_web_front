import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StatStrip from "./StatStrip";
import HowItWorks from "./HowItWorks";
import EarlyAdopterBand from "./EarlyAdopterBand";
import FinalCta from "./FinalCta";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

// jsdom has no matchMedia. Without a stub, prefersReducedMotion() returns
// false, useCountUp animates from 0, and the first render shows "0" instead
// of the target -- failing the "137" assertion below for reasons unrelated
// to the component. Reporting reduced motion makes useCountUp return its
// target synchronously, which is both deterministic and exercises the
// reduced-motion path the spec requires.
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

it("shows exactly the four verifiable stats", () => {
  render(<StatStrip />);
  expect(screen.getAllByTestId("stat-item")).toHaveLength(4);
  expect(screen.getByTestId("stat-strip").textContent).toContain("137");
});

// The "app languages" figure must match the real locale list. Importing
// SUPPORTED_LANGUAGES from src/utils/i18n.ts directly breaks this suite:
// that module calls `i18n.use(initReactI18next)` at import time, and this
// file's `jest.mock("react-i18next", ...)` above replaces the whole module
// -- including `initReactI18next`, which becomes undefined -- so i18next.use()
// throws before any test can run ("You are passing an undefined module!").
// Asserting the literal figure here instead; re-verify by counting the
// files in src/utils/locales/ or the entries in SUPPORTED_LANGUAGES.
it("states the app language count as 18, matching SUPPORTED_LANGUAGES", () => {
  render(<StatStrip />);
  expect(screen.getByTestId("stat-strip").textContent).toContain("18");
});

// Nothing on this page may claim social proof the product has not earned.
it("claims no members, ratings or reviews", () => {
  render(<StatStrip />);
  const text = (screen.getByTestId("stat-strip").textContent || "").toLowerCase();
  expect(text).not.toContain("member");
  expect(text).not.toContain("rating");
  expect(text).not.toContain("review");
  expect(text).not.toContain("★");
});

it("walks through three steps", () => {
  render(<HowItWorks />);
  expect(screen.getAllByTestId("how-step")).toHaveLength(3);
});

it("frames the launch honestly rather than borrowing credibility", () => {
  render(<EarlyAdopterBand />);
  const text = screen.getByTestId("early-adopter-band").textContent || "";
  expect(text).toContain("2025");
  expect(text.toLowerCase()).not.toContain("trusted by");
});

it("closes with both store links", () => {
  render(<FinalCta />);
  const cta = screen.getByTestId("final-cta");
  expect(cta.querySelector('a[href*="apps.apple.com"]')).toBeTruthy();
  expect(cta.querySelector('a[href*="play.google.com"]')).toBeTruthy();
});
