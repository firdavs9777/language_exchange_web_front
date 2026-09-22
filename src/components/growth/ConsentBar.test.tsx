import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import ConsentBar from "./ConsentBar";
import { openSurface, _resetSurfacesForTests } from "./surfaceRegistry";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));
jest.mock("../../analytics/ga", () => ({ loadGa: jest.fn(), gaEvent: jest.fn() }));
const { loadGa } = require("../../analytics/ga");

beforeEach(() => {
  window.localStorage.clear();
  _resetSurfacesForTests();
  (loadGa as jest.Mock).mockClear();
});

it("is absent from server output", () => {
  expect(renderToString(<ConsentBar />)).toBe("");
});

it("shows when undecided and loads GA only on accept", () => {
  render(<ConsentBar />);
  expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
  expect(loadGa).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("OK"));
  expect(window.localStorage.getItem("bt.consent")).toBe("granted");
  expect(loadGa).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
});

it("records a refusal and never loads GA", () => {
  render(<ConsentBar />);
  fireEvent.click(screen.getByText("No thanks"));
  expect(window.localStorage.getItem("bt.consent")).toBe("denied");
  expect(loadGa).not.toHaveBeenCalled();
  expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
});

it("stays hidden once decided, and loads GA on return visits when granted", () => {
  window.localStorage.setItem("bt.consent", "granted");
  render(<ConsentBar />);
  expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
  expect(loadGa).toHaveBeenCalledTimes(1);
});

it("shows when storage throws (treated as undecided)", () => {
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<ConsentBar />);
  expect(screen.getByTestId("consent-bar")).toBeInTheDocument();
  spy.mockRestore();
});

it("steps aside while the download popup is open", () => {
  render(<ConsentBar />);
  act(() => openSurface("download-popup"));
  expect(screen.queryByTestId("consent-bar")).not.toBeInTheDocument();
});
