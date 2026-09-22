import "@testing-library/jest-dom";
import { render, screen, act, fireEvent } from "@testing-library/react";
import PromoCarousel from "./PromoCarousel";
import { PROMO_SLIDES } from "../../data/promoSlides";

beforeEach(() => {
  window.localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

it("renders the first slide and a dot per slide", () => {
  render(<PromoCarousel />);
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[0].title);
  expect(screen.getAllByTestId("promo-dot")).toHaveLength(PROMO_SLIDES.length);
});

it("advances on its own", () => {
  render(<PromoCarousel />);
  act(() => { jest.advanceTimersByTime(6000); });
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[1].title);
});

it("pauses while hovered", () => {
  render(<PromoCarousel />);
  fireEvent.mouseEnter(screen.getByTestId("promo-carousel"));
  act(() => { jest.advanceTimersByTime(12000); });
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[0].title);
});

it("jumps to a slide when its dot is clicked", () => {
  render(<PromoCarousel />);
  fireEvent.click(screen.getAllByTestId("promo-dot")[2]);
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[2].title);
});

it("disappears when dismissed, and stays gone on remount", () => {
  const { unmount } = render(<PromoCarousel />);
  fireEvent.click(screen.getByTestId("promo-dismiss"));
  expect(screen.queryByTestId("promo-carousel")).not.toBeInTheDocument();
  unmount();
  render(<PromoCarousel />);
  expect(screen.queryByTestId("promo-carousel")).not.toBeInTheDocument();
});

it("uses only the two sanctioned tones", () => {
  PROMO_SLIDES.forEach((s) => expect(["brand", "banana"]).toContain(s.tone));
});

it("marks the current dot with aria-current and moves it on click", () => {
  render(<PromoCarousel />);
  const dots = screen.getAllByTestId("promo-dot");
  expect(dots.filter((d) => d.getAttribute("aria-current") === "true")).toHaveLength(1);
  expect(dots[0]).toHaveAttribute("aria-current", "true");
  fireEvent.click(dots[2]);
  expect(dots[2]).toHaveAttribute("aria-current", "true");
  expect(dots[0]).not.toHaveAttribute("aria-current", "true");
});

it("pauses while keyboard-focused on a descendant", () => {
  render(<PromoCarousel />);
  const ctaLink = screen.getByText(PROMO_SLIDES[0].ctaLabel);
  fireEvent.focus(ctaLink);
  act(() => { jest.advanceTimersByTime(12000); });
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[0].title);
  fireEvent.blur(ctaLink);
  act(() => { jest.advanceTimersByTime(6000); });
  expect(screen.getByTestId("promo-slide")).toHaveTextContent(PROMO_SLIDES[1].title);
});
