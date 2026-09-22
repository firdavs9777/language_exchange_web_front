import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import ConsentBar from "./ConsentBar";
import { _resetSurfacesForTests } from "./surfaceRegistry";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));
// No REACT_APP_GA_MEASUREMENT_ID: every GA call is already a no-op, so the bar
// would collect a decision nothing acts on. This is the default in development
// and in every environment that has not been given an id.
jest.mock("../../analytics/ga", () => ({ GA_MEASUREMENT_ID: "", loadGa: jest.fn(), gaEvent: jest.fn() }));

beforeEach(() => {
  window.localStorage.clear();
  _resetSurfacesForTests();
});

it("stays hidden with no measurement id, even with consent undecided", () => {
  render(<ConsentBar />);
  expect(window.localStorage.getItem("bt.consent")).toBeNull(); // undecided
  expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
});
