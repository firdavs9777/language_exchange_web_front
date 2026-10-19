import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import HomeHero from "./HomeHero";
import HomeSteps from "./HomeSteps";
import HomeFeatures from "./HomeFeatures";
import HomeCta from "./HomeCta";

// "echo" proves every visible string goes through home.v2.*; "fallback"
// proves the `t(key) || "English"` idiom.
let mockTMode: "echo" | "fallback" = "fallback";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => (mockTMode === "echo" ? key : "") }),
}));
let mockStats: any = { data: undefined };
jest.mock("../../../store/slices/publicStatsSlice", () => ({
  ...jest.requireActual("../../../store/slices/publicStatsSlice"),
  useGetPublicStatsQuery: () => mockStats,
}));

beforeEach(() => {
  mockTMode = "fallback";
  mockStats = { data: undefined };
});

describe("HomeHero", () => {
  it("sells in one screen: headline, store buttons, web CTA", () => {
    render(<HomeHero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Speak a new language with real people");
    const hero = screen.getByTestId("home-hero");
    expect(hero.querySelector('[data-testid="store-link-ios"]')?.getAttribute("href")).toContain("utm_campaign=hero");
    expect(hero.querySelector('[data-testid="store-link-android"]')?.getAttribute("href")).toContain("utm_campaign=hero");
    expect(screen.getByTestId("hero-web-cta")).toHaveAttribute("href", "/register");
  });

  it("shows a learner count only when the stats endpoint has one", () => {
    const { unmount } = render(<HomeHero />);
    expect(screen.queryByTestId("hero-proof-learners")).not.toBeInTheDocument();
    expect(screen.getByTestId("hero-proof")).toHaveTextContent("137");
    unmount();

    mockStats = { data: { learners: 12000, countries: 40, languages: 137, generatedAt: "x" } };
    render(<HomeHero />);
    expect(screen.getByTestId("hero-proof-learners")).toHaveTextContent("12,000+");
  });

  it("routes its copy through home.v2.hero.*", () => {
    mockTMode = "echo";
    render(<HomeHero />);
    const hero = screen.getByTestId("home-hero");
    ["home.v2.hero.title", "home.v2.hero.titleAccent", "home.v2.hero.subtitle", "home.v2.hero.web"].forEach((k) =>
      expect(hero).toHaveTextContent(k)
    );
  });

  it("keeps the chips decorative", () => {
    const { container } = render(<HomeHero />);
    const chips = Array.from(container.querySelectorAll(".motion-safe\\:animate-bt-float"));
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => expect(chip).toHaveAttribute("aria-hidden"));
  });
});

describe("HomeSteps", () => {
  it("walks through three steps and ends with a CTA", () => {
    render(<HomeSteps />);
    const steps = screen.getAllByTestId("home-step");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Pick your languages");
    expect(steps[1]).toHaveTextContent("Match with natives");
    expect(steps[2]).toHaveTextContent("Chat, call & learn");
    expect(screen.getByTestId("steps-cta")).toHaveAttribute("href", "/register");
  });
});

describe("HomeFeatures", () => {
  it("shows four benefit-led features, each with a screenshot and three bullets", () => {
    render(<HomeFeatures />);
    const features = screen.getAllByTestId("home-feature");
    expect(features).toHaveLength(4);
    features.forEach((f) => {
      expect(f.querySelector("h3")).not.toBeNull();
      expect(f.querySelectorAll("li")).toHaveLength(3);
      const img = f.querySelector("img");
      expect(img?.getAttribute("alt")).toBeTruthy();
      expect(img).toHaveAttribute("loading", "lazy");
      expect(f.querySelector('source[type="image/webp"]')).not.toBeNull();
    });
  });

  it("is the navbar's /#features target", () => {
    render(<HomeFeatures />);
    expect(screen.getByTestId("home-features")).toHaveAttribute("id", "features");
  });

  it("routes every feature string through home.v2.features.<key>.*", () => {
    mockTMode = "echo";
    render(<HomeFeatures />);
    ["chat", "study", "moments", "community"].forEach((key) =>
      ["eyebrow", "title", "body", "b1", "b2", "b3"].forEach((field) =>
        expect(screen.getByTestId("home-features")).toHaveTextContent(`home.v2.features.${key}.${field}`)
      )
    );
  });
});

describe("HomeCta", () => {
  it("closes with both stores tagged as the final CTA", () => {
    render(<HomeCta />);
    const cta = screen.getByTestId("home-cta");
    expect(cta.querySelector('[data-testid="store-link-ios"]')?.getAttribute("href")).toContain("utm_campaign=final-cta");
    expect(cta.querySelector('[data-testid="store-link-android"]')?.getAttribute("href")).toContain("utm_campaign=final-cta");
    expect(cta).toHaveTextContent("Your first conversation is one tap away");
  });
});
