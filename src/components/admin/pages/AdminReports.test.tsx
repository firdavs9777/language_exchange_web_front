import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminReports from "./AdminReports";
import { REPORT_FIXTURE } from "../reports/reportFixture";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const mockReport = jest.fn();
const mockSettings = jest.fn();
const mockUpdate = jest.fn();
jest.mock("../../../store/slices/adminSlice", () => ({
  useGetAdminReportQuery: (...args: any[]) => mockReport(...args),
  useGetAdminReportSettingsQuery: (...args: any[]) => mockSettings(...args),
  useUpdateAdminReportSettingsMutation: () => [mockUpdate, { isLoading: false }],
}));

const ok = (data: any, extra: any = {}) => ({
  data,
  currentData: data,
  isLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: !!data,
  refetch: jest.fn(),
  ...extra,
});

let lastSearch = "";
const LocationProbe: React.FC = () => {
  lastSearch = useLocation().search;
  return null;
};

const renderAt = (url = "/admin/reports") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/admin/reports"
          element={
            <>
              <AdminReports />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const kpi = (label: string) =>
  screen.getAllByTestId("stat-card").find((c) => c.textContent?.includes(label)) as HTMLElement;

beforeEach(() => {
  lastSearch = "";
  mockReport.mockReset().mockReturnValue(ok(REPORT_FIXTURE));
  mockSettings.mockReset().mockReturnValue(ok({ daily: true, weekly: true, monthly: false }));
  mockUpdate.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

it("renders KPIs, chart and every block from a fixture report", () => {
  const { container } = renderAt();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reports");
  expect(screen.getByText(/Oct 12 – 18, 2026/)).toBeInTheDocument();

  expect(kpi("Visitors")).toHaveTextContent("4,812");
  expect(kpi("Visitors")).toHaveTextContent("▲ 12%");
  expect(kpi("Page views")).toHaveTextContent("19,340");
  expect(kpi("Page views")).toHaveTextContent("▲ 8%");
  expect(kpi("Sign-ups (web)")).toHaveTextContent("186");
  expect(kpi("Sign-ups (web)")).toHaveTextContent("▲ 21%");
  expect(kpi("Active members")).toHaveTextContent("1,204");
  expect(kpi("Active members")).toHaveTextContent("▼ 3%");
  expect(kpi("Pages / visit")).toHaveTextContent("4.0");
  expect(kpi("Pages / visit")).toHaveTextContent("3m 40s");

  // Two lines in the traffic chart (visitors and page views).
  const traffic = screen.getByTestId("report-traffic");
  expect(within(traffic).getAllByTestId("line-series")).toHaveLength(2);

  const countries = screen.getByTestId("report-countries");
  expect(countries).toHaveTextContent("🇰🇷");
  expect(countries).toHaveTextContent("South Korea");
  expect(countries).toHaveTextContent("1,640");
  expect(countries).toHaveTextContent("Uzbekistan");

  const sources = screen.getByTestId("report-sources");
  expect(sources).toHaveTextContent("google");
  expect(sources).toHaveTextContent("Direct");
  expect(sources).toHaveTextContent("campaign: oct_promo");

  const pages = screen.getByTestId("report-top-pages");
  expect(pages).toHaveTextContent("/communities");
  expect(pages).toHaveTextContent("3,410");
  expect(pages).toHaveTextContent("2:15");

  const funnel = screen.getByTestId("report-funnel");
  expect(funnel).toHaveTextContent("Opened sign-up");
  expect(funnel).toHaveTextContent("690");
  expect(funnel).toHaveTextContent("Tapped app store");
  expect(funnel).toHaveTextContent("340");

  const devices = screen.getByTestId("report-devices");
  expect(devices).toHaveTextContent("Mobile");
  expect(devices).toHaveTextContent("68%");
  expect(devices).toHaveTextContent("Korean");

  const sections = screen.getByTestId("report-sections");
  expect(sections).toHaveTextContent("Chat");
  expect(sections).toHaveTextContent("720");
  expect(sections).toHaveTextContent("11m");
  expect(sections).toHaveTextContent("AI Study");

  const members = screen.getByTestId("report-members");
  expect(members).toHaveTextContent("38,211");
  expect(members).toHaveTextContent("42%");
  const app = screen.getByTestId("report-app");
  expect(app).toHaveTextContent("52,300");
  expect(screen.getByTestId("report-vip")).toHaveTextContent("14");

  expect(container.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
});

it("switching Day/Week/Month and the date requests that period", () => {
  renderAt("/admin/reports?period=week&date=2026-10-14");
  expect(mockReport).toHaveBeenLastCalledWith({ period: "week", date: "2026-10-14" });
  expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "Day" }));
  expect(mockReport).toHaveBeenLastCalledWith({ period: "day", date: "2026-10-14" });
  expect(lastSearch).toContain("period=day");
  expect(lastSearch).toContain("date=2026-10-14");

  fireEvent.click(screen.getByRole("button", { name: "Month" }));
  expect(mockReport).toHaveBeenLastCalledWith({ period: "month", date: "2026-10-14" });

  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-03" } });
  expect(mockReport).toHaveBeenLastCalledWith({ period: "month", date: "2026-09-03" });
  expect(lastSearch).toContain("date=2026-09-03");
});

it("defaults to the current week when the URL says nothing", () => {
  renderAt();
  expect(mockReport).toHaveBeenLastCalledWith({ period: "week", date: undefined });
  // The picker shows the period's first KST day.
  expect(screen.getByLabelText("Date")).toHaveValue("2026-10-12");
});

it("ignores a period it does not know", () => {
  renderAt("/admin/reports?period=year&date=nonsense");
  expect(mockReport).toHaveBeenLastCalledWith({ period: "week", date: undefined });
});

it("comparison shows — when previous is null", () => {
  mockReport.mockReturnValue(ok({ ...REPORT_FIXTURE, previous: null }));
  const { container } = renderAt();
  expect(kpi("Visitors")).toHaveTextContent("—");
  expect(kpi("Visitors")).not.toHaveTextContent("%");
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  screen.getAllByTestId("stat-card").forEach((card) => {
    expect(card.textContent).not.toMatch(/(^|[^0-9])0%/);
  });
  expect(within(screen.getByTestId("report-store-taps")).getByTestId("taps-ios")).toHaveTextContent("—");
});

it("comparison shows — per field and 'new' when the previous value was 0", () => {
  mockReport.mockReturnValue(
    ok({
      ...REPORT_FIXTURE,
      members: { ...REPORT_FIXTURE.members, retention: null },
      previous: { ...REPORT_FIXTURE.previous, visitors: null, active: null, webSignups: 0 },
    })
  );
  renderAt();
  expect(kpi("Visitors")).toHaveTextContent("—");
  expect(kpi("Active members")).toHaveTextContent("—");
  expect(kpi("Sign-ups (web)")).toHaveTextContent("new");
  expect(kpi("Page views")).toHaveTextContent("▲ 8%");
  expect(screen.getByTestId("report-members")).not.toHaveTextContent("%");
});

it("404 shows the not-switched-on state", () => {
  mockReport.mockReturnValue(ok(undefined, { isError: true, error: { status: 404 } }));
  renderAt();
  expect(screen.getByTestId("reports-off")).toHaveTextContent("Reports are not switched on yet");
  expect(screen.queryByTestId("report-countries")).not.toBeInTheDocument();
});

it("another failure shows the load error, not the switched-off state", () => {
  mockReport.mockReturnValue(ok(undefined, { isError: true, error: { status: 500 } }));
  renderAt();
  expect(screen.queryByTestId("reports-off")).not.toBeInTheDocument();
  expect(screen.getByTestId("section-error")).toBeInTheDocument();
});

it("section row click shows its top pages", () => {
  renderAt();
  expect(screen.queryByTestId("section-pages")).not.toBeInTheDocument();
  const rows = within(screen.getByTestId("report-sections")).getAllByTestId("data-row");
  fireEvent.click(rows[1]); // Community
  const drill = screen.getByTestId("section-pages");
  expect(drill).toHaveTextContent("/community/:id");
  expect(drill).toHaveTextContent("900");
  fireEvent.click(rows[0]); // Chat
  expect(screen.getByTestId("section-pages")).toHaveTextContent("/chat/:id");
});

it("App store clicks block shows iOS and Android totals, the by-button table and the by-source table", () => {
  renderAt();
  const block = screen.getByTestId("report-store-taps");
  expect(within(block).getByTestId("taps-ios")).toHaveTextContent("205");
  expect(within(block).getByTestId("taps-android")).toHaveTextContent("131");
  expect(within(block).getAllByTestId("line-series")).toHaveLength(2);

  const byButton = within(block).getByTestId("taps-by-button");
  const buttonRows = within(byButton).getAllByTestId("data-row");
  expect(buttonRows).toHaveLength(4);
  expect(buttonRows[0]).toHaveTextContent("Hero");
  expect(buttonRows[0]).toHaveTextContent("120");
  expect(buttonRows[0]).toHaveTextContent("70");
  expect(buttonRows[1]).toHaveTextContent("Download page");
  expect(buttonRows[2]).toHaveTextContent("Sticky banner");

  const bySource = within(block).getByTestId("taps-by-source");
  const sourceRows = within(bySource).getAllByTestId("data-row");
  expect(sourceRows).toHaveLength(3);
  expect(sourceRows[1]).toHaveTextContent("campaign: oct_promo");
  expect(sourceRows[1]).toHaveTextContent("70");
  expect(sourceRows[1]).toHaveTextContent("41");
});

it("email toggles call PUT with only the changed key", async () => {
  renderAt();
  const weekly = screen.getByRole("checkbox", { name: "Weekly" });
  const monthly = screen.getByRole("checkbox", { name: "Monthly" });
  expect(weekly).toBeChecked();
  expect(monthly).not.toBeChecked();
  fireEvent.click(weekly);
  expect(mockUpdate).toHaveBeenLastCalledWith({ weekly: false });
  fireEvent.click(monthly);
  expect(mockUpdate).toHaveBeenLastCalledWith({ monthly: true });
  expect(mockUpdate).toHaveBeenCalledTimes(2);
  // Both saves settle without an error message.
  await waitFor(() => expect(mockUpdate.mock.results).toHaveLength(2));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

it("a failed toggle save says so and falls back to the server's value", async () => {
  mockUpdate.mockReturnValue({ unwrap: () => Promise.reject(new Error("nope")) });
  renderAt();
  const daily = screen.getByRole("checkbox", { name: "Daily" });
  fireEvent.click(daily);
  expect(mockUpdate).toHaveBeenLastCalledWith({ daily: false });
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
  expect(screen.getByRole("checkbox", { name: "Daily" })).toBeChecked();
});

it("exports the report as a CSV file", () => {
  const createObjectURL = jest.fn(() => "blob:report");
  const revokeObjectURL = jest.fn();
  (URL as any).createObjectURL = createObjectURL;
  (URL as any).revokeObjectURL = revokeObjectURL;
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  renderAt();
  fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(click).toHaveBeenCalled();
  click.mockRestore();
});

it("shows a loading state while the report is in flight", () => {
  mockReport.mockReturnValue(ok(undefined, { isLoading: true }));
  renderAt();
  expect(screen.getByTestId("section-loading")).toBeInTheDocument();
});

it("shares are of the true totals, not of the top-10 rows the backend sends", () => {
  mockReport.mockReturnValue(
    ok({
      ...REPORT_FIXTURE,
      web: {
        ...REPORT_FIXTURE.web,
        visits: 10000,
        visitors: 1000,
        // A long tail: the rows shown sum to far less than the totals.
        sources: [
          { type: "search", name: "google", count: 2000 },
          { type: "direct", name: "direct", count: 500 },
        ],
        devices: [{ device: "mobile", count: 500 }],
        languages: [{ language: "ko", count: 300 }],
      },
    })
  );
  const { container } = renderAt();
  const sources = screen.getByTestId("report-sources");
  expect(sources).toHaveTextContent("20%");
  expect(sources).toHaveTextContent("5%");
  expect(sources).not.toHaveTextContent("80%");
  const devices = screen.getByTestId("report-devices");
  expect(devices).toHaveTextContent("50%");
  expect(devices).not.toHaveTextContent("100%");
  expect(devices).toHaveTextContent("Korean 30%");
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
});

it("a share never exceeds 100% and a zero total shows —", () => {
  mockReport.mockReturnValue(
    ok({
      ...REPORT_FIXTURE,
      web: {
        ...REPORT_FIXTURE.web,
        visits: 0,
        visitors: 10,
        sources: [{ type: "search", name: "google", count: 3 }],
        // A visitor seen on two devices is counted under each.
        devices: [{ device: "mobile", count: 12 }],
      },
    })
  );
  renderAt();
  const sourceBar = within(screen.getByTestId("report-sources")).getByTestId("report-bar");
  expect(sourceBar).toHaveTextContent("—");
  expect(sourceBar).not.toHaveTextContent("%");
  expect(screen.getByTestId("report-devices")).toHaveTextContent("100%");
  expect(screen.getByTestId("report-devices")).not.toHaveTextContent("120%");
});

it("while another period loads it shows loading, not the previous period's numbers", () => {
  // RTK keeps the last report in `data` during a refetch with new args;
  // `currentData` is undefined until the new one arrives.
  mockReport.mockReturnValue(ok(REPORT_FIXTURE, { currentData: undefined, isFetching: true }));
  renderAt("/admin/reports?period=day&date=2026-10-20");
  expect(screen.getByTestId("section-loading")).toBeInTheDocument();
  expect(screen.queryByText(/Oct 12 – 18, 2026/)).not.toBeInTheDocument();
  expect(screen.queryByTestId("report-countries")).not.toBeInTheDocument();
});

it("the visitors legend shows the period's unique visitors, not the sum of the days", () => {
  mockReport.mockReturnValue(
    ok({
      ...REPORT_FIXTURE,
      web: {
        ...REPORT_FIXTURE.web,
        visitors: 6,
        pageViews: 68,
        // The same person on two days counts once in the period.
        series: [
          { x: "2026-10-19", visitors: 3, pageViews: 30 },
          { x: "2026-10-20", visitors: 4, pageViews: 38 },
        ],
      },
    })
  );
  renderAt();
  const items = within(screen.getByTestId("report-traffic")).getByTestId("line-legend").querySelectorAll("li");
  expect(items[0]).toHaveTextContent(/^Visitors6$/);
  expect(items[1]).toHaveTextContent(/^Page views68$/);
});

// Phone layout guard. A CSS grid without an explicit template sizes its track
// by the widest content (a table's nowrap header), and a grid item's default
// `min-width: auto` lets that content widen it: the page then scrolls sideways
// at 320-390px. Every grid on the page must declare a minmax(0, 1fr) base
// template (grid-cols-N, unprefixed), and every card must carry min-w-0.
it("every grid declares a base column template and every card can shrink (no sideways scroll on a phone)", () => {
  const { container } = renderAt();
  const grids = Array.from(container.querySelectorAll<HTMLElement>(".grid"));
  expect(grids.length).toBeGreaterThan(5);
  grids.forEach((g) => {
    const classes = (g.getAttribute("class") || "").split(/\s+/);
    expect(classes.some((c) => /^grid-cols-\d+$/.test(c))).toBe(true);
  });
  screen.getAllByTestId("surface-card").forEach((card) => {
    if (card.closest(".grid")) {
      const inKpis = card.parentElement && /\[&>\*\]:min-w-0/.test(card.parentElement.className);
      expect(inKpis || card.className.split(/\s+/).includes("min-w-0")).toBe(true);
    }
  });
  // A bar row's label and bar shrink, so only the short number is fixed-width.
  screen.getAllByTestId("report-bar").forEach((row) => {
    const [label, bar] = Array.from(row.children);
    expect(label.className.split(/\s+/)).toContain("min-w-0");
    expect(label.className).not.toMatch(/(^|\s)shrink-0(\s|$)/);
    expect(bar.className).toMatch(/(^|\s)flex-1(\s|$)/);
  });
});
