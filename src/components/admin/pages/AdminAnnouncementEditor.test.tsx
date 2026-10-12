import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AdminAnnouncementEditor from "./AdminAnnouncementEditor";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const mockPrepared: any[] = [];
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();
jest.mock("../../../store/slices/adminSlice", () => ({
  useGetAnnouncementQuery: (...args: any[]) => mockGet(...args),
  useCreateAnnouncementMutation: () => mockCreate(),
  useUpdateAnnouncementMutation: () => mockUpdate(),
  useUploadAnnouncementImageMutation: () => mockUpload(),
  useDeleteAnnouncementMutation: () => mockDelete(),
}));

jest.mock("../parts/AnnouncementPublishBar", () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <button type="button" data-testid="publish-bar" disabled={props.disabled}
        onClick={() => props.prepare("schedule").then((id: any) => mockPrepared.push(["schedule", id]))}>
        {props.status}
      </button>
      <button type="button" data-testid="publish-now" disabled={props.disabled}
        onClick={() => props.prepare("publish").then((id: any) => mockPrepared.push(["publish", id]))}>
        now
      </button>
    </div>
  ),
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
let deleteTrigger: jest.Mock;
const resolved = (value: any) => jest.fn(() => ({ unwrap: () => Promise.resolve(value) }));

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;
const GoTo = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/admin/announcements/new")}>go-new</button>
      <button type="button" onClick={() => navigate("/admin/announcements/a1")}>go-a1</button>
    </>
  );
};
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/announcements/:id" element={<><AdminAnnouncementEditor /><LocationProbe /><GoTo /></>} />
        <Route path="/admin/announcements" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  mockPrepared.length = 0;
  mockGet.mockReset().mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createTrigger = resolved({ ...LIVE, id: "a9", status: "draft" });
  updateTrigger = resolved(LIVE);
  uploadTrigger = resolved({ url: "https://cdn/up.jpg" });
  mockCreate.mockReset().mockReturnValue([createTrigger, { isLoading: false }]);
  mockUpdate.mockReset().mockReturnValue([updateTrigger, { isLoading: false }]);
  mockUpload.mockReset().mockReturnValue([uploadTrigger, { isLoading: false }]);
  deleteTrigger = resolved({ id: "a1" });
  mockDelete.mockReset().mockReturnValue([deleteTrigger, { isLoading: false }]);
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
  fireEvent.change(screen.getByLabelText("Button link"), { target: { value: "ftp://x.example" } });
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

it("the publish bar gets the status and Schedule validates a future start before saving", () => {
  renderAt("/admin/announcements/new");
  expect(screen.getByTestId("publish-bar")).toHaveTextContent("draft");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.click(screen.getByTestId("publish-bar"));
  expect(screen.getByTestId("error-startsAt")).toHaveTextContent("Pick a start time to schedule.");
  expect(createTrigger).not.toHaveBeenCalled();
});

it("Publish now with an end time already past is rejected before saving", () => {
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2020-01-01T10:00" } });
  fireEvent.click(screen.getByTestId("publish-now"));
  expect(screen.getByTestId("error-endsAt")).toBeInTheDocument();
  expect(createTrigger).not.toHaveBeenCalled();
});

it("prepare resolves to the saved id, and the editor survives its own create (no remount)", async () => {
  createTrigger = resolved({
    ...LIVE, id: "a9", status: "draft", translations: { en: { title: "Hello", body: "World", buttonLabel: "" } },
  });
  mockCreate.mockReturnValue([createTrigger, { isLoading: false }]);
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.click(screen.getByTestId("publish-now"));
  await waitFor(() => expect(mockPrepared).toEqual([["publish", "a9"]]));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/announcements/a9"));
  // The bar is still mounted (its confirm dialog would live in it) and the text is intact.
  expect(screen.getByTestId("publish-now")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Hello");
});

it("Back/Forward between /new and an existing id never reuses the other's form (no duplicate create)", async () => {
  mockGet.mockImplementation((arg: any) => ({ data: arg === "a1" ? LIVE : undefined, isLoading: false, isError: false }));
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Typed on new" } });
  fireEvent.click(screen.getByText("go-a1"));
  expect(screen.getByLabelText("Title")).toHaveValue("Live title");
  fireEvent.click(screen.getByText("go-new"));
  expect(screen.getByLabelText("Title")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Fresh" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(createTrigger).toHaveBeenCalledTimes(1));
  expect(updateTrigger).not.toHaveBeenCalled();
});

it("a double click on Save sends one request", async () => {
  let release: (v: any) => void = () => undefined;
  createTrigger = jest.fn(() => ({ unwrap: () => new Promise((resolve) => { release = resolve; }) }));
  mockCreate.mockReturnValue([createTrigger, { isLoading: false }]);
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  const save = screen.getByRole("button", { name: "Save draft" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(createTrigger).toHaveBeenCalledTimes(1);
  release({ ...LIVE, id: "a9", status: "draft" });
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/announcements/a9"));
});

it("a background refetch does not discard unsaved edits, but a clean form follows the server", () => {
  mockGet.mockReturnValue({ data: LIVE, isLoading: false, isError: false });
  const view = renderAt("/admin/announcements/a1");
  expect(screen.getByLabelText("Title")).toHaveValue("Live title");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Mid-edit" } });
  mockGet.mockReturnValue({ data: { ...LIVE, updatedAt: "2026-10-12T09:30:00.000Z" }, isLoading: false, isError: false });
  view.rerender(
    <MemoryRouter initialEntries={["/admin/announcements/a1"]}>
      <Routes>
        <Route path="/admin/announcements/:id" element={<><AdminAnnouncementEditor /><LocationProbe /><GoTo /></>} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Mid-edit");
});

it("Save is disabled while an image uploads", () => {
  mockUpload.mockReturnValue([uploadTrigger, { isLoading: true }]);
  renderAt("/admin/announcements/new");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(screen.getByTestId("publish-bar")).toBeDisabled();
});

it("while the new id's first fetch is loading, the publish bar stays mounted", async () => {
  mockGet.mockReturnValue({ data: undefined, isLoading: true, isError: false });
  createTrigger = resolved({
    ...LIVE, id: "a9", status: "draft", translations: { en: { title: "Hello", body: "World", buttonLabel: "" } },
  });
  mockCreate.mockReturnValue([createTrigger, { isLoading: false }]);
  renderAt("/admin/announcements/new");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "World" } });
  fireEvent.click(screen.getByTestId("publish-now"));
  await waitFor(() => expect(mockPrepared).toEqual([["publish", "a9"]]));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/announcements/a9"));
  expect(screen.queryByText("Loading…")).toBeNull();
  expect(screen.getByTestId("publish-now")).toBeInTheDocument();
});

const DRAFT = { ...LIVE, status: "draft", startsAt: null };

it("says that language targeting does not reach 2.6.1 users", () => {
  renderAt("/admin/announcements/new");
  expect(screen.getByTestId("language-hint")).toHaveTextContent("2.6.1");
  expect(screen.getByTestId("language-hint")).toHaveTextContent("all languages");
});

it("a saved draft can be deleted after confirming; the editor returns to the list", async () => {
  mockGet.mockReturnValue({ data: DRAFT, isLoading: false, isError: false });
  renderAt("/admin/announcements/a1");
  fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
  expect(deleteTrigger).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete draft" }));
  await waitFor(() => expect(deleteTrigger).toHaveBeenCalledWith("a1"));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/admin\/announcements$/));
});

it("a refused delete shows the server message in the dialog", async () => {
  mockGet.mockReturnValue({ data: DRAFT, isLoading: false, isError: false });
  deleteTrigger = jest.fn(() => ({ unwrap: () => Promise.reject({ data: { message: "Only a draft can be deleted; end it instead" } }) }));
  mockDelete.mockReturnValue([deleteTrigger, { isLoading: false }]);
  renderAt("/admin/announcements/a1");
  fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete draft" }));
  expect(await screen.findByText("Only a draft can be deleted; end it instead")).toBeInTheDocument();
});

it("Delete is offered only for a saved draft", () => {
  const first = renderAt("/admin/announcements/new");
  expect(screen.queryByRole("button", { name: "Delete draft" })).not.toBeInTheDocument();
  first.unmount();
  mockGet.mockReturnValue({ data: LIVE, isLoading: false, isError: false });
  renderAt("/admin/announcements/a1");
  expect(screen.queryByRole("button", { name: "Delete draft" })).not.toBeInTheDocument();
});

it("shows the push delivery panel with attempts and an exhausted failure", () => {
  mockGet.mockReturnValue({
    data: { ...LIVE, notify: true, delivery: { ...LIVE.delivery, state: "failed", targeted: 50, pushed: 10, attempts: 3, error: "FCM down" } },
    isLoading: false, isError: false,
  });
  renderAt("/admin/announcements/a1");
  const panel = screen.getByTestId("delivery-panel");
  expect(within(panel).getByTestId("delivery-state")).toHaveTextContent("Failed");
  expect(panel).toHaveTextContent("Attempts 3/3");
  expect(within(panel).getByTestId("delivery-error")).toHaveTextContent("FCM down");
  expect(within(panel).getByTestId("delivery-exhausted")).toHaveTextContent("Gave up after 3 attempts");
});

it("a live failed send under the cap says the job retries it; no panel without notify", () => {
  mockGet.mockReturnValue({
    data: { ...LIVE, notify: true, delivery: { ...LIVE.delivery, state: "failed", attempts: 1, error: "x" } },
    isLoading: false, isError: false,
  });
  const first = renderAt("/admin/announcements/a1");
  expect(screen.getByTestId("delivery-note")).toHaveTextContent("retries");
  first.unmount();
  mockGet.mockReturnValue({ data: LIVE, isLoading: false, isError: false });
  renderAt("/admin/announcements/a1");
  expect(screen.queryByTestId("delivery-panel")).not.toBeInTheDocument();
});
