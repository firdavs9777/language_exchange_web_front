import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { apiSlice } from "../../../store/slices/apiSlice";
import AdminReports from "./AdminReports";
import { REPORT_FIXTURE } from "../reports/reportFixture";

/**
 * The email toggles through the real RTK store, mutation and cache — the path
 * the mocked page tests can't see. The server below never changes its GET
 * answer (as if a refetch raced the write), so any render that falls back to
 * the server's old value would show up.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let putResult: "ok" | "fail" = "ok";
let releasePut: () => void = () => undefined;
const calls: { method: string; url: string }[] = [];

beforeEach(() => {
  calls.length = 0;
  putResult = "ok";
  (global as any).fetch = jest.fn(async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const method = ((init && init.method) || (typeof input === "string" ? "GET" : input.method) || "GET").toUpperCase();
    calls.push({ method, url });
    if (url.includes("/admin/reports/settings")) {
      if (method === "PUT") {
        // Held open until the test releases it, to look at the in-flight state.
        await new Promise<void>((resolve) => {
          releasePut = resolve;
        });
        if (putResult === "fail") return json({ success: false }, 500);
        return json({ success: true, data: { daily: true, weekly: false, monthly: true } });
      }
      return json({ success: true, data: { daily: true, weekly: true, monthly: true } });
    }
    if (url.includes("/admin/reports")) return json({ success: true, data: REPORT_FIXTURE });
    return json({}, 404);
  });
});

const makeStore = () =>
  configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (state: any = { userInfo: { user: { _id: "me", role: "admin" } } }) => state,
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(apiSlice.middleware),
  });

const cachedWeekly = (store: any): any => {
  const q = store.getState()[apiSlice.reducerPath].queries;
  const entry: any = Object.values(q).find((e: any) => e && e.endpointName === "getAdminReportSettings");
  return entry && entry.data ? entry.data.weekly : undefined;
};

it("a saved toggle never shows its old value again (no flicker after the PUT)", async () => {
  const store = makeStore();
  // Every value the cache holds, in order, from the first load onwards.
  const seen: any[] = [];
  store.subscribe(() => {
    const v = cachedWeekly(store);
    if (v !== undefined && seen[seen.length - 1] !== v) seen.push(v);
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/reports"]}>
        <AdminReports />
      </MemoryRouter>
    </Provider>
  );
  const weekly = await screen.findByRole("checkbox", { name: "Weekly" });
  await screen.findByTestId("report-countries");
  expect(weekly).toBeChecked();

  fireEvent.click(weekly);
  // Optimistic: unchecked while the PUT is still in flight.
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Weekly" })).not.toBeChecked());
  await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
  await act(async () => {
    releasePut();
    await new Promise((r) => setTimeout(r, 0));
  });

  await waitFor(() => expect(cachedWeekly(store)).toBe(false));
  // Give any invalidation refetch the chance to land.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(screen.getByRole("checkbox", { name: "Weekly" })).not.toBeChecked();
  expect(seen).toEqual([true, false]);
  // The write did not trigger a refetch of the settings.
  expect(calls.filter((c) => c.method === "GET" && c.url.includes("/reports/settings"))).toHaveLength(1);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("a failed save rolls the toggle back and says so", async () => {
  putResult = "fail";
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/reports"]}>
        <AdminReports />
      </MemoryRouter>
    </Provider>
  );
  const weekly = await screen.findByRole("checkbox", { name: "Weekly" });
  await screen.findByTestId("report-countries");
  fireEvent.click(weekly);
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Weekly" })).not.toBeChecked());
  await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
  await act(async () => {
    releasePut();
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
  expect(screen.getByRole("checkbox", { name: "Weekly" })).toBeChecked();
});
