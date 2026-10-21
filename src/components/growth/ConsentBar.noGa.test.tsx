import "@testing-library/jest-dom";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import ConsentBar from "./ConsentBar";
import { openConsentManager } from "../../analytics/consent";
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

it("cannot be opened by the manager either: there is nothing to manage", () => {
  render(<ConsentBar />);
  act(() => openConsentManager());
  expect(screen.queryByTestId("consent-manager")).not.toBeInTheDocument();
});

describe("with ads on and no GA id", () => {
  const prev = process.env.REACT_APP_ADSENSE_AUTO_ADS;
  const prevClient = process.env.REACT_APP_ADSENSE_CLIENT;
  beforeEach(() => {
    process.env.REACT_APP_ADSENSE_AUTO_ADS = "true";
    process.env.REACT_APP_ADSENSE_CLIENT = "ca-pub-1234567890123456";
  });
  afterEach(() => {
    if (prevClient === undefined) delete process.env.REACT_APP_ADSENSE_CLIENT;
    else process.env.REACT_APP_ADSENSE_CLIENT = prevClient;
    if (prev === undefined) delete process.env.REACT_APP_ADSENSE_AUTO_ADS;
    else process.env.REACT_APP_ADSENSE_AUTO_ADS = prev;
  });

  it("bar shows with ads on and no GA id", () => {
    render(<ConsentBar />);
    expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
  });

  it("the manager opens", () => {
    render(<ConsentBar />);
    act(() => openConsentManager());
    expect(screen.getByTestId("consent-manager")).toBeInTheDocument();
  });
});

it("stays hidden with auto ads on but no AdSense client id: no ads load", () => {
  const prev = process.env.REACT_APP_ADSENSE_AUTO_ADS;
  const prevClient = process.env.REACT_APP_ADSENSE_CLIENT;
  process.env.REACT_APP_ADSENSE_AUTO_ADS = "true";
  delete process.env.REACT_APP_ADSENSE_CLIENT;
  try {
    render(<ConsentBar />);
    expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
  } finally {
    if (prev === undefined) delete process.env.REACT_APP_ADSENSE_AUTO_ADS;
    else process.env.REACT_APP_ADSENSE_AUTO_ADS = prev;
    if (prevClient !== undefined) process.env.REACT_APP_ADSENSE_CLIENT = prevClient;
  }
});
