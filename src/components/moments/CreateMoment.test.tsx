import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import CreateMoment from "./CreateMoment";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "", i18n: { language: "en" } }) }));
jest.mock("react-toastify", () => ({
  Bounce: {},
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockCreate = jest.fn();
const mockUpload = jest.fn();
let mockAppConfig: any = { data: undefined, isError: false };
jest.mock("../../store/slices/momentsSlice", () => ({
  useCreateMomentMutation: () => [mockCreate],
  useUploadMomentPhotosMutation: () => [mockUpload],
  useUploadMomentVideoMutation: () => [mockUpload],
  useUploadMomentAudioMutation: () => [mockUpload],
}));
jest.mock("../../store/slices/appConfigSlice", () => ({
  useGetAppConfigQuery: () => mockAppConfig,
}));

function renderCreate() {
  const store = configureStore({
    reducer: { auth: (s: any = { userInfo: { user: { _id: "u1", name: "Ada", imageUrls: [] } } }) => s },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CreateMoment />
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  mockAppConfig = { data: undefined, isError: false };
  mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ data: { _id: "new1" } }) });
  mockUpload.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

const describe_ = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText(/on your mind/i), { target: { value: text } });
const share = () => fireEvent.click(screen.getByRole("button", { name: "Share" }));
const payload = () => mockCreate.mock.calls[0][0];

it("posts a plain moment with today's defaults", async () => {
  renderCreate();
  describe_("Hello");
  share();
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(payload()).toEqual(
    expect.objectContaining({
      title: "",
      description: "Hello",
      user: "u1",
      location: null,
      mood: "",
      tags: [],
      privacy: "public",
      language: "en",
      category: "general",
    })
  );
});

it("cannot share without a description", () => {
  renderCreate();
  expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
});

it("carries the chosen mood, category, language and tags", async () => {
  renderCreate();
  describe_("Hi");
  fireEvent.click(screen.getByTitle("Add mood"));
  fireEvent.click(screen.getByRole("button", { name: /Happy/ }));
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "food" } });
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ko" } });
  fireEvent.click(screen.getByTitle("Add tags"));
  const tagInput = screen.getByPlaceholderText(/Add a tag/);
  fireEvent.change(tagInput, { target: { value: "kimchi" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  share();
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(payload()).toEqual(
    expect.objectContaining({ mood: "happy", category: "food", language: "ko", tags: ["kimchi"] })
  );
});

it("stops at five tags", () => {
  renderCreate();
  fireEvent.click(screen.getByTitle("Add tags"));
  const tagInput = screen.getByPlaceholderText(/Add a tag/);
  ["a", "b", "c", "d", "e"].forEach((tag) => {
    fireEvent.change(tagInput, { target: { value: tag } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
  });
  fireEvent.change(tagInput, { target: { value: "f" } });
  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
});

it("a text moment carries its background; a photo moment does not", async () => {
  renderCreate();
  describe_("Hi");
  fireEvent.click(screen.getByRole("button", { name: /Text/ }));
  fireEvent.click(screen.getByLabelText("gradient_ocean"));
  share();
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(payload()).toEqual(expect.objectContaining({ mediaType: "text", backgroundColor: "gradient_ocean" }));
});

it("chooses who can see it", async () => {
  renderCreate();
  describe_("Hi");
  fireEvent.click(screen.getByRole("button", { name: /Public/ }));
  fireEvent.click(screen.getByRole("button", { name: /Only me/ }));
  share();
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(payload().privacy).toBe("private");
});

describe("scheduling", () => {
  it("offers no schedule while the server does not enforce it", () => {
    renderCreate();
    expect(screen.queryByLabelText("Schedule")).not.toBeInTheDocument();
  });

  it("offers no schedule when app-config fails", () => {
    mockAppConfig = { data: undefined, isError: true };
    renderCreate();
    expect(screen.queryByLabelText("Schedule")).not.toBeInTheDocument();
  });

  it("never sends the old scheduledDate field", async () => {
    renderCreate();
    describe_("Hi");
    share();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(payload()).not.toHaveProperty("scheduledDate");
    expect(payload()).not.toHaveProperty("scheduledFor");
  });

  it("sends scheduledFor as an ISO instant when enforced", async () => {
    mockAppConfig = { data: { momentSchedulingEnforced: true }, isError: false };
    renderCreate();
    describe_("Hi");
    fireEvent.change(screen.getByLabelText("Schedule"), { target: { value: "2099-01-02T09:30" } });
    share();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(payload().scheduledFor).toBe(new Date("2099-01-02T09:30").toISOString());
  });

  it("a past time blocks sharing", () => {
    mockAppConfig = { data: { momentSchedulingEnforced: true }, isError: false };
    renderCreate();
    describe_("Hi");
    fireEvent.change(screen.getByLabelText("Schedule"), { target: { value: "2020-01-02T09:30" } });
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });
});
