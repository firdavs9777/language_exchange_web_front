import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import LanguageMarquee from "./LanguageMarquee";
import { MARQUEE_LANGUAGES } from "../../../data/marqueeLanguages";

it("renders a chip per language, duplicated for a seamless loop", () => {
  render(<LanguageMarquee />);
  expect(screen.getAllByTestId("marquee-chip")).toHaveLength(MARQUEE_LANGUAGES.length * 2);
});

it("gives every chip a real flag, never the globe", () => {
  render(<LanguageMarquee />);
  screen.getAllByTestId("marquee-chip").forEach((chip) => {
    expect(chip.textContent).not.toContain("🌐");
  });
});

// The app's own _untaggable set cannot represent a written exchange in these,
// so advertising them would promise something the product cannot do.
it("excludes sign languages", () => {
  const lower = MARQUEE_LANGUAGES.map((l) => l.toLowerCase());
  expect(lower.some((l) => l.includes("sign language"))).toBe(false);
});

it("is a curated list, not the whole catalog", () => {
  expect(MARQUEE_LANGUAGES).toHaveLength(24);
});

it("leads with the languages the backend calls popular", () => {
  expect(MARQUEE_LANGUAGES.slice(0, 4)).toEqual(["English", "Korean", "Japanese", "Chinese"]);
});
