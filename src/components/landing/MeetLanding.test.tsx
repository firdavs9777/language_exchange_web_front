import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import MeetLanding from "./MeetLanding";

// `mockTMode` toggles the mocked `t` between echoing its key (proves the copy
// is routed through i18n) and returning "" (proves the `t(key) || "English"`
// fallback idiom, which is what renders until task B7 merges the locales).
// Must be prefixed with "mock" -- babel-plugin-jest-hoist only allows
// referencing such names from inside a jest.mock() factory.
let mockTMode: "echo" | "fallback" = "fallback";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => (mockTMode === "echo" ? key : "") }),
}));

beforeEach(() => {
  mockTMode = "fallback";
});

it("leads with the phrase the page targets, in a single h1", () => {
  const { container } = render(<MeetLanding />);
  const h1s = container.querySelectorAll("h1");
  expect(h1s).toHaveLength(1);
  expect((h1s[0].textContent || "").toLowerCase()).toContain("meet people from other countries");
});

it("assembles the hero, the steps, the features, the marquee and the closing CTA", () => {
  render(<MeetLanding />);
  ["hero-demo", "how-it-works", "feature-showcase", "language-marquee", "final-cta"].forEach((id) =>
    expect(screen.getByTestId(id)).toBeInTheDocument()
  );
});

// The demo is the page's argument: two people making weekend plans across a
// language, not a grammar drill.
it("plays a conversation between two languages, translated both ways", () => {
  render(<MeetLanding />);
  const hero = screen.getByTestId("hero-demo").textContent || "";
  expect(hero).toContain("Bora ver o pôr do sol no sábado?");
  expect(hero).toContain("Want to watch the sunset on Saturday?");
  expect(screen.getAllByTestId("demo-message").length).toBe(2);
});

// This is a page about friendship, and the spec is explicit: it is not a
// dating page and must not read as one.
it("never says the word this page is not about", () => {
  const { container } = render(<MeetLanding />);
  expect(container.textContent || "").not.toMatch(/date/i);
});

it("tags every store link as the meet placement", () => {
  render(<MeetLanding />);
  const hrefs = [
    ...screen.getAllByTestId("store-link-ios"),
    ...screen.getAllByTestId("store-link-android"),
  ].map((a) => a.getAttribute("href") || "");
  expect(hrefs.length).toBe(4);
  hrefs.forEach((href) => expect(href).toContain("utm_campaign=meet"));
});

it("shows the features that are about meeting people, not all six", () => {
  render(<MeetLanding />);
  const cards = screen.getAllByTestId("feature-card").map((c) => c.textContent || "");
  expect(cards.length).toBe(4);
  expect(cards.some((c) => c.includes("Gatherings"))).toBe(true);
  expect(cards.some((c) => c.includes("AI tutor"))).toBe(false);
});

it("routes its own copy through the meet.* namespace", () => {
  mockTMode = "echo";
  const { container } = render(<MeetLanding />);
  const text = container.textContent || "";
  [
    "meet.hero.title",
    "meet.hero.titleAccent",
    "meet.hero.subtitle",
    "meet.howItWorks.title",
    "meet.howItWorks.steps.1.title",
    "meet.features.title",
    "meet.cta.title",
  ].forEach((key) => expect(text).toContain(key));
});

// Prerendered in Node: nothing here may read a browser global during render.
it("renders to a string on the server with its content intact", () => {
  const html = renderToString(<MeetLanding />);
  expect((html.match(/<h1[\s>]/g) || []).length).toBe(1);
  expect(html).toContain("Meet people from other countries");
  expect(html).not.toContain("undefined");
});
