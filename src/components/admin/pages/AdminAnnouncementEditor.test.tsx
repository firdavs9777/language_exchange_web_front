import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminAnnouncementEditor from "./AdminAnnouncementEditor";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpload = jest.fn();
jest.mock("../../../store/slices/adminSlice", () => ({
  useGetAnnouncementQuery: (...args: any[]) => mockGet(...args),
  useCreateAnnouncementMutation: () => mockCreate(),
  useUpdateAnnouncementMutation: () => mockUpdate(),
  useUploadAnnouncementImageMutation: () => mockUpload(),
}));

const LIVE = {
  id: "a1", _id: "a1", status: "live", priority: 3, defaultLocale: "en",
  translations: { en: { title: "Live title", body: "Live body", buttonLabel: "" } },
  emoji: "🎉", imageUrl: null, buttonUrl: null, platforms: ["ios"], languages: [],
  startsAt: "2026-10-12T09:00:00.000Z", endsAt: null, showInApp: true, notify: false,
  publishedAt: null, endedAt: null, updatedAt: "2026-10-12T09:00:00.000Z", createdAt: "",
  delivery: { state: "none", targeted: 0, pushed: 0, listed: 0, failed: 0, startedAt: null, finishedAt: null },
};

let createTrigger: jest.Mock;
let updateTrigger: jest.Mock;
let uploadTrigger: jest.Mock;
const resolved = (value: any) => jest.fn(() => ({ unwrap: () => Promise.resolve(value) }));

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/announcements/:id" element={<><AdminAnnouncementEditor /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  mockGet.mockReset().mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createTrigger = resolved({ ...LIVE, id: "a9", status: "draft" });
  updateTrigger = resolved(LIVE);
  uploadTrigger = resolved({ url: "https://cdn/up.jpg" });
  mockCreate.mockReset().mockReturnValue([createTrigger, { isLoading: false }]);
  mockUpdate.mockReset().mockReturnValue([updateTrigger, { isLoading: false }]);
  mockUpload.mockReset().mockReturnValue([uploadTrigger, { isLoading: false }]);
});

it("new: Save draft with no text shows the default-language errors and sends nothing", () => {
  renderAt("/admin/announcements/new");
  expect(mockGet).toHaveBeenLastCalledWith(null, { skip: true });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(screen.getByTestId("error-translations.en.title")).toBeInTheDocument();
  expect(screen.getByTestId("error-translations.en.body")).toBeInTheDocument();
  expect(createTrigger).not.toHaveBeenCalled();
});

it("new: a valid draft is created with the form payload and the URL moves to its id", async () => {
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.click(screen.getByLabelText("Send notification"));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/announcements/a9"));
  const body = createTrigger.mock.calls[0][0];
  expect(body.translations).toEqual({ en: { title: "Hello", body: "World", buttonLabel: "" } });
  expect(body.notify).toBe(true);
  expect(body.platforms).toEqual(["all"]);
});

it("an invalid button link is caught before the request", () => {
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.change(screen.getByLabelText("Button link"), { target: { value: "javascript:x" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(screen.getByTestId("error-buttonUrl")).toBeInTheDocument();
  expect(createTrigger).not.toHaveBeenCalled();
});

it("per-language tabs edit their own text; the preview follows the open tab", () => {
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("tab", { name: "Korean" }));
  expect(screen.getByLabelText("Title")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "안녕" } });
  expect(screen.getByTestId("announcement-preview")).toHaveTextContent("안녕");
  fireEvent.click(screen.getByRole("tab", { name: "English" }));
  expect(screen.getByLabelText("Title")).toHaveValue("Hello");
});

it("live: targeting is locked and Save sends only text, end time and priority", async () => {
  mockGet.mockReturnValue({ data: LIVE, isLoading: false, isError: false });
  renderAt("/admin/announcements/a1");
  expect(screen.getByLabelText("Title")).toHaveValue("Live title");
  expect(screen.getByLabelText("iOS")).toBeDisabled();
  expect(screen.getByLabelText("Starts")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Edited" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(updateTrigger).toHaveBeenCalled());
  const arg = updateTrigger.mock.calls[0][0];
  expect(Object.keys(arg).sort()).toEqual(["endsAt", "id", "priority", "translations"]);
  expect(arg.translations.en.title).toBe("Edited");
});

it("ended: read-only, no save button", () => {
  mockGet.mockReturnValue({ data: { ...LIVE, status: "ended" }, isLoading: false, isError: false });
  renderAt("/admin/announcements/a1");
  expect(screen.getByLabelText("Title")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
});

it("image upload fills the image URL and the preview", async () => {
  renderAt("/admin/announcements/new");
  const file = new File(["x"], "x.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Image"), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByTestId("preview-image")).toHaveAttribute("src", "https://cdn/up.jpg"));
  expect(uploadTrigger).toHaveBeenCalledWith(file);
});

it("a failed save shows the server message", async () => {
  createTrigger = jest.fn(() => ({ unwrap: () => Promise.reject({ data: { message: "endsAt must be after startsAt" } }) }));
  mockCreate.mockReturnValue([createTrigger, { isLoading: false }]);
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("endsAt must be after startsAt");
});

it("shows an error state when the announcement fails to load", () => {
  mockGet.mockReturnValue({ data: undefined, isLoading: false, isError: true });
  renderAt("/admin/announcements/a1");
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this announcement.");
});
