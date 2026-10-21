import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "./AdminLayout";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const mockSettings = jest.fn();
jest.mock("../../store/slices/adminSlice", () => ({
  useGetAdminReportSettingsQuery: (...args: any[]) => mockSettings(...args),
}));

const renderLayout = (role = "admin") => {
  const store = configureStore({
    reducer: { auth: (state: any = { userInfo: { user: { _id: "me", role } } }) => state },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>overview</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const navNames = () =>
  screen.getAllByRole("link").map((a) => a.textContent);

beforeEach(() => {
  mockSettings.mockReset();
});

it("lists Reports after Overview, and hides Reach once reports are switched on", () => {
  mockSettings.mockReturnValue({ isSuccess: true, data: { daily: true, weekly: true, monthly: true } });
  renderLayout();
  expect(navNames().slice(0, 2)).toEqual(["Overview", "Reports"]);
  expect(navNames()).not.toContain("Reach");
});

it("keeps Reach while reports are switched off", () => {
  mockSettings.mockReturnValue({ isSuccess: false, isError: true, error: { status: 404 } });
  renderLayout();
  expect(navNames()).toContain("Reach");
  expect(navNames()).toContain("Reports");
});

it("asks nothing of the server for a non-admin", () => {
  mockSettings.mockReturnValue({ isSuccess: false });
  renderLayout("user");
  expect(screen.getByText("home")).toBeInTheDocument();
  expect(mockSettings).not.toHaveBeenCalled();
});
