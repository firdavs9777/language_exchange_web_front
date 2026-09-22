import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AppBanner from "./AppBanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
jest.mock("./OpenInApp", () => () => <a href="#open">Open</a>);

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const setUserAgent = (ua: string) =>
  Object.defineProperty(window.navigator, "userAgent", { writable: true, configurable: true, value: ua });

const at = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <AppBanner />
  </MemoryRouter>
);

it("renders nothing on the server pass, even for a phone on a deep-linkable route", () => {
  setUserAgent(IPHONE);
  expect(renderToString(at("/moment/abc123"))).toBe("");
});

it("shows the banner after mount for a phone on a moment page", () => {
  setUserAgent(IPHONE);
  render(at("/moment/abc123"));
  expect(screen.getByText("Open this in the BananaTalk app")).toBeInTheDocument();
});

it("stays hidden on desktop", () => {
  setUserAgent(MAC);
  render(at("/moment/abc123"));
  expect(screen.queryByText("Open this in the BananaTalk app")).not.toBeInTheDocument();
});
