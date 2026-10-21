import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FooterMain from "./FooterMain";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "" }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("../../analytics/ga", () => ({ GA_MEASUREMENT_ID: "", loadGa: jest.fn(), gaEvent: jest.fn() }));

afterEach(() => {
  delete process.env.REACT_APP_ADSENSE_AUTO_ADS;
});

it("shows Privacy choices when ads run, even with no GA id", () => {
  process.env.REACT_APP_ADSENSE_AUTO_ADS = "true";
  render(<MemoryRouter><FooterMain /></MemoryRouter>);
  expect(screen.getByText("Privacy choices")).toBeInTheDocument();
});

it("hides it with neither GA nor ads", () => {
  render(<MemoryRouter><FooterMain /></MemoryRouter>);
  expect(screen.queryByText("Privacy choices")).not.toBeInTheDocument();
});
