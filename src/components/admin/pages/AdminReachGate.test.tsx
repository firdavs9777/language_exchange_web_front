import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminReachGate from "./AdminReachGate";

const mockSettings = jest.fn();
jest.mock("../../../store/slices/adminSlice", () => ({
  useGetAdminReportSettingsQuery: (...args: any[]) => mockSettings(...args),
}));
jest.mock("./AdminReach", () => () => <div>reach page</div>);

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/admin/reach"]}>
      <Routes>
        <Route path="/admin/reach" element={<AdminReachGate />} />
        <Route path="/admin/reports" element={<div>reports page</div>} />
      </Routes>
    </MemoryRouter>
  );

it("redirects to Reports when reports are switched on", () => {
  mockSettings.mockReturnValue({ isSuccess: true, data: { daily: true } });
  renderAt();
  expect(screen.getByText("reports page")).toBeInTheDocument();
});

it("shows Reach when reports are switched off (404)", () => {
  mockSettings.mockReturnValue({ isSuccess: false, isError: true, error: { status: 404 } });
  renderAt();
  expect(screen.getByText("reach page")).toBeInTheDocument();
});

it("shows Reach when the check fails for any other reason", () => {
  mockSettings.mockReturnValue({ isSuccess: false, isError: true, error: { status: 500 } });
  renderAt();
  expect(screen.getByText("reach page")).toBeInTheDocument();
});

it("renders nothing while it is still asking", () => {
  mockSettings.mockReturnValue({ isSuccess: false, isLoading: true });
  const { container } = renderAt();
  expect(container).toBeEmptyDOMElement();
});
