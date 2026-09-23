import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminContent from "./AdminContent";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const mockClubs = jest.fn();
const mockGatherings = jest.fn();
const mockArchive = jest.fn();
const mockCancel = jest.fn();

jest.mock("../../../store/slices/adminSlice", () => ({
  useGetAdminClubsQuery: (...args: any[]) => mockClubs(...args),
  useGetAdminGatheringsQuery: (...args: any[]) => mockGatherings(...args),
  useArchiveAdminClubMutation: () => mockArchive(),
  useCancelAdminGatheringMutation: () => mockCancel(),
}));

const CLUBS = {
  data: [
    {
      _id: "c1",
      name: "Seoul Speakers",
      language: "ko",
      languageLabel: "Korean",
      memberCount: 42,
      status: "active",
      openReports: 2,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    {
      _id: "c2",
      name: "Old Club",
      language: "ja",
      languageLabel: "Japanese",
      memberCount: 5,
      status: "archived",
      openReports: 0,
      createdAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  pagination: { total: 2, count: 2 },
};

/** A full page of clubs, for the pagination tests that need `rows.length === LIMIT`. */
const fullClubPage = (n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `page-club-${i}`,
    name: `Club ${i}`,
    language: "en",
    languageLabel: "English",
    memberCount: 10,
    status: "active",
    openReports: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
  }));

const GATHERINGS = {
  data: [
    {
      _id: "g1",
      title: "Coffee chat",
      language: "es",
      startsAt: "2026-10-01T18:00:00.000Z",
      capacity: 10,
      goingCount: 4,
      status: "scheduled",
      openReports: 1,
    },
    {
      _id: "g2",
      title: "Cancelled meetup",
      language: "fr",
      startsAt: "2026-09-15T18:00:00.000Z",
      capacity: 8,
      goingCount: 0,
      status: "cancelled",
      openReports: 0,
    },
  ],
  pagination: { total: 2, count: 2 },
};

const ok = (data: any, extra: any = {}) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
  ...extra,
});

let archiveTrigger: jest.Mock;
let cancelTrigger: jest.Mock;

beforeEach(() => {
  mockClubs.mockReset().mockReturnValue(ok(CLUBS));
  mockGatherings.mockReset().mockReturnValue(ok(GATHERINGS));
  archiveTrigger = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
  cancelTrigger = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
  mockArchive.mockReset().mockReturnValue([archiveTrigger, { isLoading: false }]);
  mockCancel.mockReset().mockReturnValue([cancelTrigger, { isLoading: false }]);
});

it("renders the page heading", () => {
  render(<AdminContent />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Content");
});

it("renders club rows on the clubs tab", () => {
  render(<AdminContent />);
  expect(screen.getByText("Seoul Speakers")).toBeInTheDocument();
  expect(screen.getByText("Old Club")).toBeInTheDocument();
});

it("switches to the gatherings tab and renders gathering rows", () => {
  render(<AdminContent />);
  fireEvent.click(screen.getByRole("tab", { name: "Gatherings" }));
  expect(screen.getByText("Coffee chat")).toBeInTheDocument();
  expect(screen.getByText("Cancelled meetup")).toBeInTheDocument();
});

it("changes the query arg when the reported toggle is switched on", () => {
  render(<AdminContent />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Reported only" }));
  const lastCall = mockClubs.mock.calls[mockClubs.mock.calls.length - 1][0];
  expect(lastCall).toMatchObject({ reported: true });
});

it("does not send a reported filter by default", () => {
  render(<AdminContent />);
  const lastCall = mockClubs.mock.calls[mockClubs.mock.calls.length - 1][0];
  expect(lastCall.reported).toBeFalsy();
});

it("opens the confirm dialog for Archive and confirms with the mutation", async () => {
  render(<AdminContent />);
  fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]);
  expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  expect(screen.getByTestId("confirm-dialog-confirm")).toBeDisabled();
  fireEvent.change(screen.getByTestId("confirm-dialog-reason"), { target: { value: "spam" } });
  expect(screen.getByTestId("confirm-dialog-confirm")).not.toBeDisabled();
  fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
  expect(archiveTrigger).toHaveBeenCalledWith({ id: "c1", archived: true, reason: "spam" });
  await waitFor(() => expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument());
});

it("cancels a gathering through the confirm dialog", async () => {
  render(<AdminContent />);
  fireEvent.click(screen.getByRole("tab", { name: "Gatherings" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.change(screen.getByTestId("confirm-dialog-reason"), { target: { value: "abuse" } });
  fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
  expect(cancelTrigger).toHaveBeenCalledWith({ id: "g1", reason: "abuse" });
  await waitFor(() => expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument());
});

it("shows Restore for an already-archived club", () => {
  render(<AdminContent />);
  expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
});

it("hides the cancel action for an already-cancelled gathering", () => {
  render(<AdminContent />);
  fireEvent.click(screen.getByRole("tab", { name: "Gatherings" }));
  const rows = screen.getAllByTestId("data-row");
  expect(rows[0]).toHaveTextContent("Coffee chat");
  expect(rows[0].querySelector("button")).not.toBeNull();
  expect(rows[1]).toHaveTextContent("Cancelled meetup");
  expect(rows[1].querySelector("button")).toBeNull();
});

it("derives hasMore from a full page and total rather than reading a backend flag", () => {
  mockClubs.mockReturnValue(ok({ data: fullClubPage(20), pagination: { total: 45, count: 20 } }));
  render(<AdminContent />);
  expect(screen.getByTestId("data-table-next")).not.toBeDisabled();
});

it("disables Next when the current page already covers the total", () => {
  render(<AdminContent />);
  expect(screen.getByTestId("data-table-next")).toBeDisabled();
});

it("disables Next on a short reported-only page even when total says there is more", () => {
  // The backend's `total` ignores the `reported` filter (it counts the
  // unfiltered match, then filters the current page in memory), so a
  // reported-only view can return far fewer than LIMIT rows while `total`
  // still looks big. A short page must never offer a next one.
  mockClubs.mockReturnValue(
    ok({ data: [CLUBS.data[0]], pagination: { total: 45, count: 1 } })
  );
  render(<AdminContent />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Reported only" }));
  expect(screen.getByTestId("data-table-next")).toBeDisabled();
});

it("shows an inline error when the clubs query fails", () => {
  mockClubs.mockReturnValue(ok(undefined, { isError: true }));
  render(<AdminContent />);
  expect(screen.getByText("Couldn't load this section.")).toBeInTheDocument();
});
