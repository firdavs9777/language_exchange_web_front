import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import MyMoments from "./MyMoments";

// jsdom has no layout, so the page's scroll-to-top is a no-op here.
window.scrollTo = jest.fn();

const mockGetMyMoments = jest.fn();
const mockDeleteMoment = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../store/slices/momentsSlice", () => ({
  useGetMyMomentsQuery: (arg: any, opts: any) => mockGetMyMoments(arg, opts),
  useDeleteMomentMutation: () => [mockDeleteMoment, { isLoading: false }],
}));

const refetch = jest.fn();
const idle = { data: undefined, isLoading: false, error: undefined };
const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });
const rejected = () => ({ unwrap: () => Promise.reject({ data: { message: "no" } }) });

const moment = (id: string, extra: any = {}) => ({
  _id: id,
  description: `moment ${id}`,
  imageUrls: [`https://cdn.test/${id}.jpg`],
  likeCount: 2,
  commentCount: 1,
  ...extra,
});

function renderPage(viewerId: string | null = "me") {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: viewerId ? { user: { _id: viewerId } } : null }) => state,
    },
  });
  return render(
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={["/my-moments"]}>
          <Routes>
            <Route path="/my-moments" element={<MyMoments />} />
            <Route path="/login" element={<div data-testid="login-screen" />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMyMoments.mockReturnValue({ ...idle, refetch });
  mockDeleteMoment.mockReturnValue(resolved());
});

it("asks for the signed-in user's moments", () => {
  renderPage();
  expect(mockGetMyMoments.mock.calls[0][0]).toEqual({ userId: "me" });
  expect(mockGetMyMoments.mock.calls[0][1].skip).toBe(false);
});

it("sends a signed-out visitor to the login page", () => {
  renderPage(null);
  expect(screen.getByTestId("login-screen")).toBeInTheDocument();
});

it("renders one square tile per moment, linking to the moment", () => {
  mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [moment("m1"), moment("m2")] } });
  renderPage();
  expect(screen.getAllByTestId("moment-tile")).toHaveLength(2);
  expect(screen.getByTestId("moment-link-m1")).toHaveAttribute("href", "/moment/m1");
  expect(screen.getAllByTestId("moment-likes")).toHaveLength(2);
});

it("renders a text tile for a moment with no photo", () => {
  mockGetMyMoments.mockReturnValue({
    ...idle,
    refetch,
    data: { data: [moment("m1", { imageUrls: [] })] },
  });
  renderPage();
  expect(screen.queryByTestId("moment-tile-image")).not.toBeInTheDocument();
  expect(screen.getByTestId("moment-tile-text")).toHaveTextContent("moment m1");
});

it("offers the empty state with a way to post", () => {
  mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [] } });
  renderPage();
  expect(screen.getByTestId("my-moments-empty")).toBeInTheDocument();
});

it("offers a retry when the list fails to load", () => {
  mockGetMyMoments.mockReturnValue({ ...idle, refetch, error: { status: 500 } });
  renderPage();
  fireEvent.click(screen.getByTestId("my-moments-retry"));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("takes the edit button to the moment editor", () => {
  mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [moment("m1")] } });
  renderPage();
  fireEvent.click(screen.getByTestId("moment-edit-m1"));
  expect(mockNavigate).toHaveBeenCalledWith("/edit-moment/m1");
});

describe("delete", () => {
  it("asks first, then calls the real mutation and drops the tile", async () => {
    mockGetMyMoments.mockReturnValue({
      ...idle,
      refetch,
      data: { data: [moment("m1"), moment("m2")] },
    });
    renderPage();

    fireEvent.click(screen.getByTestId("moment-delete-m1"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    // Nothing is sent until the confirmation is accepted.
    expect(mockDeleteMoment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(mockDeleteMoment).toHaveBeenCalledWith("m1"));
    await waitFor(() => expect(screen.getAllByTestId("moment-tile")).toHaveLength(1));
    expect(screen.queryByTestId("moment-link-m1")).not.toBeInTheDocument();
    expect(screen.getByTestId("moment-link-m2")).toBeInTheDocument();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("keeps the tile and shows the failure when the delete is rejected", async () => {
    mockDeleteMoment.mockReturnValue(rejected());
    mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [moment("m1")] } });
    renderPage();

    fireEvent.click(screen.getByTestId("moment-delete-m1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(screen.getByTestId("confirm-dialog-error")).toBeInTheDocument()
    );
    expect(screen.getAllByTestId("moment-tile")).toHaveLength(1);
  });

  it("sends nothing when the confirmation is dismissed", () => {
    mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [moment("m1")] } });
    renderPage();

    fireEvent.click(screen.getByTestId("moment-delete-m1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));

    expect(mockDeleteMoment).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("moment-tile")).toHaveLength(1);
  });
});

it("carries no Bootstrap classes and no emoji", () => {
  mockGetMyMoments.mockReturnValue({ ...idle, refetch, data: { data: [moment("m1")] } });
  const { container } = renderPage();
  expect(
    container.querySelectorAll(".card, .btn, .row, .container-fluid, .card-body")
  ).toHaveLength(0);
  expect(container.textContent).not.toMatch(
    /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}]/u
  );
});
