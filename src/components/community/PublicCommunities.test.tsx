import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import PublicCommunities from "./PublicCommunities";

// `mockTMode` toggles the mocked `t` between echoing its key (proves the copy
// is routed through i18n) and returning "" (proves the `t(key) || "English"`
// fallback idiom, which is what renders until the locale pass merges the keys).
let mockTMode: "echo" | "fallback" = "fallback";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => (mockTMode === "echo" ? key : "") }),
}));

let mockResult: any = { data: undefined };
jest.mock("../../store/slices/publicCommunitiesSlice", () => ({
  ...jest.requireActual("../../store/slices/publicCommunitiesSlice"),
  useGetPublicCommunitiesQuery: () => mockResult,
}));

const COMMUNITIES = [
  {
    id: "c1",
    name: "Korean Corner",
    description: "Daily Korean practice for beginners and returners.",
    memberCount: 4120,
    languages: ["Korean"],
  },
  {
    id: "c2",
    name: "Cafe Lingua",
    description: "Two languages, one table.",
    memberCount: 87,
    languages: ["Spanish", "English"],
  },
];

beforeEach(() => {
  mockTMode = "fallback";
  mockResult = { data: COMMUNITIES };
});

it("leads with the phrase the page targets, in a single h1", () => {
  const { container } = render(<PublicCommunities />);
  const h1s = container.querySelectorAll("h1");
  expect(h1s).toHaveLength(1);
  expect((h1s[0].textContent || "").toLowerCase()).toContain("language exchange communities");
});

it("renders one card per community with its name and description", () => {
  render(<PublicCommunities />);
  const cards = screen.getAllByTestId("public-community-card");
  expect(cards).toHaveLength(2);
  expect(screen.getByText("Korean Corner")).toBeInTheDocument();
  expect(screen.getByText("Daily Korean practice for beginners and returners.")).toBeInTheDocument();
  expect(screen.getByText("Cafe Lingua")).toBeInTheDocument();
});

// The card is the shared SurfaceCard, not a second card treatment.
it("builds each card on the shared surface", () => {
  render(<PublicCommunities />);
  expect(screen.getAllByTestId("surface-card").length).toBe(2);
});

it("shows the member count, grouped", () => {
  render(<PublicCommunities />);
  const counts = screen.getAllByTestId("public-community-members").map((n) => n.textContent || "");
  expect(counts[0]).toContain("4,120");
  expect(counts[1]).toContain("87");
});

it("renders one language pill per language the community speaks", () => {
  render(<PublicCommunities />);
  const cards = screen.getAllByTestId("public-community-card");
  expect(cards[0].querySelectorAll('[data-testid="language-pill"]')).toHaveLength(1);
  expect(cards[1].querySelectorAll('[data-testid="language-pill"]')).toHaveLength(2);
  expect(cards[0].textContent).toContain("KO");
  expect(cards[1].textContent).toContain("ES");
  expect(cards[1].textContent).toContain("EN");
});

// Joining happens in the app; the web page's only action is the store.
it("makes every card action a communities-tagged store link", () => {
  render(<PublicCommunities />);
  const hrefs = [
    ...screen.getAllByTestId("store-link-ios"),
    ...screen.getAllByTestId("store-link-android"),
  ].map((a) => a.getAttribute("href") || "");
  expect(hrefs.length).toBe(4);
  hrefs.forEach((href) => expect(href).toContain("utm_campaign=communities"));
  expect(screen.queryByRole("button", { name: /join/i })).not.toBeInTheDocument();
});

it("shows the empty state, with both store badges, when the list is empty", () => {
  mockResult = { data: [] };
  render(<PublicCommunities />);
  expect(screen.getByTestId("public-communities-empty")).toBeInTheDocument();
  expect(screen.queryAllByTestId("public-community-card")).toHaveLength(0);
  expect(screen.getByTestId("store-link-ios")).toBeInTheDocument();
  expect(screen.getByTestId("store-link-android")).toBeInTheDocument();
});

// A dead endpoint is not an error page: the visitor still gets the pitch.
it("shows the same empty state when the fetch failed", () => {
  mockResult = { data: undefined, isError: true, error: { status: 500 } };
  const { container } = render(<PublicCommunities />);
  expect(screen.getByTestId("public-communities-empty")).toBeInTheDocument();
  expect(container.querySelectorAll("h1")).toHaveLength(1);
  expect(container.textContent || "").not.toMatch(/error|went wrong/i);
});

it("routes its own copy through the communities.public.* namespace", () => {
  mockTMode = "echo";
  const { container } = render(<PublicCommunities />);
  const text = container.textContent || "";
  ["communities.public.title", "communities.public.intro", "communities.public.members"].forEach(
    (key) => expect(text).toContain(key)
  );
});

// Prerendered in Node: nothing here may read a browser global during render.
it("renders to a string on the server with its content intact", () => {
  const html = renderToString(<PublicCommunities />);
  expect((html.match(/<h1[\s>]/g) || []).length).toBe(1);
  expect(html).toContain("Language exchange communities");
  expect(html).toContain("Korean Corner");
  expect(html).not.toContain("undefined");
});
