import "@testing-library/jest-dom";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import PromoCarousel from "./PromoCarousel";
import { PROMO_SLIDES, promoKey } from "../../data/promoSlides";

// Same idiom as HeroDemo.test: `mockTMode` toggles the mocked `t` between
// echoing its key (proves every string is routed through i18n) and returning
// "" the way src/utils/i18n.ts does for a missing key (proves the
// `t(key) || "English"` fallback). Must be prefixed with "mock" --
// babel-plugin-jest-hoist only allows referencing such names in the factory.
let mockTMode: "echo" | "fallback" = "fallback";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => (mockTMode === "echo" ? key : "") }),
}));

beforeEach(() => {
  mockTMode = "fallback";
  window.localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

const slides = () => screen.getAllByTestId("promo-slide");
const current = () => slides().filter((s) => s.getAttribute("data-active") === "true");
const currentSlide = () => current()[0];

it("renders every slide from the data, with its eyebrow, title and body", () => {
  render(<PromoCarousel />);
  expect(slides()).toHaveLength(PROMO_SLIDES.length);
  PROMO_SLIDES.forEach((slide, i) => {
    expect(slides()[i]).toHaveTextContent(slide.eyebrow);
    expect(slides()[i]).toHaveTextContent(slide.title);
    expect(slides()[i]).toHaveTextContent(slide.body);
  });
});

it("gives every slide a screenshot with alt text and both sources", () => {
  render(<PromoCarousel />);
  PROMO_SLIDES.forEach((slide) => {
    const img = screen.getByAltText(slide.image.alt) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(slide.image.png);
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
    const source = img.closest("picture")!.querySelector("source");
    expect(source).toHaveAttribute("srcset", slide.image.webp);
    expect(source).toHaveAttribute("type", "image/webp");
  });
});

// The first slide is the one a visitor sees; the rest are below the fold of
// attention, so they must not compete with the hero for bandwidth.
it("loads the first screenshot eagerly at high priority and the rest lazily", () => {
  render(<PromoCarousel />);
  const first = screen.getByAltText(PROMO_SLIDES[0].image.alt);
  expect(first).toHaveAttribute("loading", "eager");
  expect(first).toHaveAttribute("fetchpriority", "high");
  PROMO_SLIDES.slice(1).forEach((slide) => {
    const img = screen.getByAltText(slide.image.alt);
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).not.toHaveAttribute("fetchpriority");
  });
});

it("shows the first slide and a dot per slide", () => {
  render(<PromoCarousel />);
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
  expect(current()).toHaveLength(1);
  expect(screen.getAllByTestId("promo-dot")).toHaveLength(PROMO_SLIDES.length);
});

it("hides the slides it is not showing from assistive tech", () => {
  render(<PromoCarousel />);
  expect(currentSlide()).not.toHaveAttribute("aria-hidden", "true");
  slides()
    .filter((s) => s.getAttribute("data-active") !== "true")
    .forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
});

it("advances on its own", () => {
  render(<PromoCarousel />);
  act(() => { jest.advanceTimersByTime(6000); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[1].title);
});

it("wraps around at the end", () => {
  render(<PromoCarousel />);
  act(() => { jest.advanceTimersByTime(6000 * PROMO_SLIDES.length); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
});

it("pauses while hovered", () => {
  render(<PromoCarousel />);
  fireEvent.mouseEnter(screen.getByTestId("promo-carousel"));
  act(() => { jest.advanceTimersByTime(12000); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
});

it("pauses while keyboard-focused on a descendant", () => {
  render(<PromoCarousel />);
  const dot = screen.getAllByTestId("promo-dot")[0];
  fireEvent.focus(dot);
  act(() => { jest.advanceTimersByTime(12000); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
  fireEvent.blur(dot);
  act(() => { jest.advanceTimersByTime(6000); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[1].title);
});

it("stands still for a visitor who asked for reduced motion", () => {
  const matchMedia = jest.fn().mockReturnValue({ matches: true });
  (window as any).matchMedia = matchMedia;
  render(<PromoCarousel />);
  act(() => { jest.advanceTimersByTime(30000); });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
  delete (window as any).matchMedia;
});

it("jumps to a slide when its dot is clicked", () => {
  render(<PromoCarousel />);
  fireEvent.click(screen.getAllByTestId("promo-dot")[2]);
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[2].title);
});

it("exposes the dots as a tablist and marks the current one", () => {
  render(<PromoCarousel />);
  const tablist = screen.getByRole("tablist");
  const dots = within(tablist).getAllByRole("tab");
  expect(dots).toHaveLength(PROMO_SLIDES.length);
  expect(dots[0]).toHaveAttribute("aria-selected", "true");
  fireEvent.click(dots[2]);
  expect(dots[2]).toHaveAttribute("aria-selected", "true");
  expect(dots[0]).toHaveAttribute("aria-selected", "false");
});

it("moves with the arrow keys, wrapping at both ends", () => {
  render(<PromoCarousel />);
  const carousel = screen.getByTestId("promo-carousel");
  fireEvent.keyDown(carousel, { key: "ArrowRight" });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[1].title);
  fireEvent.keyDown(carousel, { key: "ArrowLeft" });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[0].title);
  fireEvent.keyDown(carousel, { key: "ArrowLeft" });
  expect(currentSlide()).toHaveTextContent(PROMO_SLIDES[PROMO_SLIDES.length - 1].title);
});

it("disappears when dismissed, and stays gone on remount", () => {
  const { unmount } = render(<PromoCarousel />);
  fireEvent.click(screen.getByTestId("promo-dismiss"));
  expect(screen.queryByTestId("promo-carousel")).not.toBeInTheDocument();
  unmount();
  render(<PromoCarousel />);
  expect(screen.queryByTestId("promo-carousel")).not.toBeInTheDocument();
});

// Both stores on a real screen, where we cannot know which one the visitor
// wants; one "get the app" button below 640px, where /download makes the hop.
it("offers both stores, tagged as the promo carousel", () => {
  render(<PromoCarousel />);
  const links = screen.getAllByTestId(/^store-link-/);
  expect(links.filter((a) => a.getAttribute("data-testid") === "store-link-ios")).toHaveLength(
    PROMO_SLIDES.length
  );
  links.forEach((a) =>
    expect(a.getAttribute("href")).toContain("utm_campaign=promo-carousel")
  );
});

// A slide that says "get the app" means the store, not a page about the store:
// `go=1` is what DownloadApp reads to make the hop (spec 5.3).
it("sends the compact CTA to the download page with the redirect flag", () => {
  render(<PromoCarousel />);
  const ctas = screen.getAllByTestId("promo-cta");
  expect(ctas).toHaveLength(PROMO_SLIDES.length);
  ctas.forEach((a, i) => {
    expect(a).toHaveAttribute("href", "/download?go=1");
    expect(a).toHaveTextContent(PROMO_SLIDES[i].cta);
  });
});

// Every visible string is a translation key with an English fallback, so the
// 18 locales can pick this up without the component changing again.
it("routes every slide string through i18n", () => {
  mockTMode = "echo";
  render(<PromoCarousel />);
  PROMO_SLIDES.forEach((slide, i) => {
    const el = slides()[i];
    ["eyebrow", "title", "body", "cta"].forEach((field) =>
      expect(el).toHaveTextContent(promoKey(slide.key, field))
    );
    expect(within(el).getByAltText(promoKey(slide.key, "alt"))).toBeInTheDocument();
  });
});

it("carries no emoji and no inline colour", () => {
  const { container } = render(<PromoCarousel />);
  expect(container.innerHTML).not.toMatch(/style="[^"]*#[0-9a-f]{3}/i);
  expect(container.textContent || "").not.toMatch(
    /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u
  );
});
