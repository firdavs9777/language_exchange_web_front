import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MomentsAppPromo from "./MomentsAppPromo";

// t is swapped per test: "" exercises the inline English fallback path the
// codebase relies on when a key is missing everywhere; the key-echo exercises
// the real lookup path so a typo in a key shows up as a failing test.
let mockTranslate: (key: string) => string = () => "";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => mockTranslate(key) }),
}));

beforeEach(() => {
  mockTranslate = () => "";
});

it("renders the app-promo section with store links", () => {
  render(<MomentsAppPromo />);
  expect(screen.getByTestId("moments-app-promo")).toBeInTheDocument();
  expect(screen.getByTestId("moments-promo-appstore")).toHaveAttribute(
    "href",
    expect.stringContaining("apps.apple.com")
  );
  expect(screen.getByTestId("moments-promo-playstore")).toHaveAttribute(
    "href",
    expect.stringContaining("play.google.com")
  );
});

it("lists the app-only perks with English fallback copy", () => {
  render(<MomentsAppPromo />);
  expect(screen.getAllByTestId("moments-promo-perk")).toHaveLength(4);
  expect(screen.getByText("Moments lives in the app now")).toBeInTheDocument();
  expect(screen.getByText("Stories that disappear")).toBeInTheDocument();
  expect(screen.getAllByText("In the app")).toHaveLength(4);
});

it("reads every string from moments_section.promo when the locale has it", () => {
  mockTranslate = (key) => key;
  render(<MomentsAppPromo />);
  expect(screen.getByText("moments_section.promo.title")).toBeInTheDocument();
  expect(screen.getByText("moments_section.promo.subtitle")).toBeInTheDocument();
  expect(screen.getByTestId("moments-promo-appstore")).toHaveTextContent(
    "moments_section.promo.appStore"
  );
  expect(screen.getByTestId("moments-promo-playstore")).toHaveTextContent(
    "moments_section.promo.playStore"
  );
  for (const perk of ["stories", "aiStudy", "reactions", "notifications"]) {
    expect(screen.getByText(`moments_section.promo.perks.${perk}.title`)).toBeInTheDocument();
    expect(screen.getByText(`moments_section.promo.perks.${perk}.body`)).toBeInTheDocument();
  }
  expect(screen.getAllByText("moments_section.promo.appOnly")).toHaveLength(4);
});

it("every locale file carries the same promo key set as English", () => {
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "../../utils/locales");
  const flatten = (o: any, prefix = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
  const english = flatten(
    JSON.parse(fs.readFileSync(path.join(dir, "eng.json"), "utf8")).moments_section.promo
  ).sort();
  expect(english).toContain("perks.stories.title");
  for (const file of fs.readdirSync(dir).filter((f: string) => f.endsWith(".json"))) {
    const promo = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).moments_section?.promo;
    expect({ file, keys: promo ? flatten(promo).sort() : null }).toEqual({ file, keys: english });
  }
});
