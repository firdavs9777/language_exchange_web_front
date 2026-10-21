import "@testing-library/jest-dom";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPolicy from "./PrivacyPolicy";

jest.mock("../../analytics/ga", () => ({ GA_MEASUREMENT_ID: "", loadGa: jest.fn(), gaEvent: jest.fn() }));

const text = () =>
  (render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>).container.textContent || "").replace(/\s+/g, " ");

describe("privacy policy states what is collected", () => {
  afterEach(() => {
    delete process.env.REACT_APP_ADSENSE_AUTO_ADS;
    delete process.env.REACT_APP_ADSENSE_CLIENT;
  });
  it("is dated October 21, 2026", () => {
    const t = text();
    expect(t).toMatch(/Last Updated:\s*October 21, 2026/);
  });
  it("country only, IP not stored for analytics, 13 months", () => {
    const t = text();
    expect(t).toMatch(/country/i);
    expect(t).toMatch(/IP address is not stored for analytics/i);
    expect(t).toMatch(/13 months/);
  });
  it("AdSense, ad cookies, opt-out", () => {
    const t = text();
    expect(t).toMatch(/Google AdSense/);
    expect(t).toMatch(/ad cookies/i);
    expect(t).toContain("https://adssettings.google.com");
    expect(t).toMatch(/Privacy choices/);
  });
  it("login IPs kept for security", () => {
    expect(text()).toMatch(/last 20 logins/i);
  });
  it("credits GeoLite2 by MaxMind", () => {
    const t = text();
    expect(t).toContain("This product includes GeoLite2 data created by MaxMind, available from https://www.maxmind.com");
  });
  it("no longer claims nothing is collected", () => {
    expect(text()).not.toMatch(/nothing is collected/i);
  });
  it("offers the privacy choices control when ads run, even with no GA id", () => {
    process.env.REACT_APP_ADSENSE_AUTO_ADS = "true";
    process.env.REACT_APP_ADSENSE_CLIENT = "ca-pub-1234567890123456";
    const { getByTestId } = render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>);
    expect(getByTestId("policy-privacy-choices")).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/choose at any time whether ads are personalized and whether analytics cookies are used/);
  });
});
