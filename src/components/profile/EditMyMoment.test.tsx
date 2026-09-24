import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import EditMyMoment from "./EditMyMoment";

const mockGetMomentDetails = jest.fn();
const mockUpdateMoment = jest.fn();
const mockUploadPhotos = jest.fn();
const mockNavigate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("react-toastify", () => ({
  Bounce: "bounce",
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

jest.mock("../../store/slices/momentsSlice", () => ({
  useGetMomentDetailsQuery: (arg: any) => mockGetMomentDetails(arg),
  useUpdateMomentMutation: () => [mockUpdateMoment, { isLoading: false }],
  useUploadMomentPhotosMutation: () => [mockUploadPhotos, { isLoading: false }],
}));

const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });
const rejected = () => ({ unwrap: () => Promise.reject({ status: 500 }) });

const MOMENT = {
  _id: "m1",
  title: "Busan",
  description: "Sunset by the sea",
  user: { _id: "me" },
  imageUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"],
};

function renderEditor(data: any = { data: MOMENT }, isLoading = false) {
  mockGetMomentDetails.mockReturnValue({ data, isLoading });
  const store = configureStore({
    reducer: { auth: (state: any = { userInfo: { user: { _id: "me" } } }) => state },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/edit-moment/m1"]}>
        <Routes>
          <Route path="/edit-moment/:id" element={<EditMyMoment />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateMoment.mockReturnValue(resolved());
  mockUploadPhotos.mockReturnValue(resolved());
});

it("fills the form from the moment and lists its current images", () => {
  renderEditor();
  expect((screen.getByTestId("edit-moment-title") as HTMLInputElement).value).toBe("Busan");
  expect(
    (screen.getByTestId("edit-moment-description") as HTMLTextAreaElement).value
  ).toBe("Sunset by the sea");
  expect(screen.getAllByTestId("existing-image")).toHaveLength(2);
});

it("shows a spinner while the moment loads", () => {
  renderEditor(undefined, true);
  expect(screen.getByTestId("edit-moment-loading")).toBeInTheDocument();
});

it("removes an existing image from the set that will be saved", async () => {
  renderEditor();
  fireEvent.click(screen.getByTestId("remove-existing-0"));
  expect(screen.getAllByTestId("existing-image")).toHaveLength(1);

  fireEvent.submit(screen.getByTestId("edit-moment-form"));
  await waitFor(() => expect(mockUpdateMoment).toHaveBeenCalledTimes(1));
  expect(mockUpdateMoment.mock.calls[0][0].momentData.existingImages).toEqual([
    "https://cdn.test/b.jpg",
  ]);
});

it("saves the edited title and description, then leaves for the list", async () => {
  renderEditor();
  fireEvent.change(screen.getByTestId("edit-moment-title"), {
    target: { value: "Busan at night" },
  });
  fireEvent.submit(screen.getByTestId("edit-moment-form"));

  await waitFor(() => expect(mockUpdateMoment).toHaveBeenCalledTimes(1));
  expect(mockUpdateMoment.mock.calls[0][0]).toEqual({
    id: "m1",
    momentData: {
      title: "Busan at night",
      description: "Sunset by the sea",
      existingImages: MOMENT.imageUrls,
    },
  });
  // No new files were chosen, so the photo endpoint is left alone.
  expect(mockUploadPhotos).not.toHaveBeenCalled();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/my-moments"));
});

it("reports a failed save and stays on the form", async () => {
  mockUpdateMoment.mockReturnValue(rejected());
  renderEditor();
  fireEvent.submit(screen.getByTestId("edit-moment-form"));

  await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  expect(mockNavigate).not.toHaveBeenCalledWith("/my-moments");
});

it("refuses to save an empty title", async () => {
  renderEditor();
  fireEvent.change(screen.getByTestId("edit-moment-title"), { target: { value: "" } });
  expect(screen.getByTestId("edit-moment-save")).toBeDisabled();

  fireEvent.submit(screen.getByTestId("edit-moment-form"));
  await waitFor(() => expect(mockUpdateMoment).not.toHaveBeenCalled());
});

it("bounces someone who does not own the moment", () => {
  renderEditor({ data: { ...MOMENT, user: { _id: "someone-else" } } });
  expect(mockToastError).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith("/moments");
});

it("uses no react-bootstrap markup and no emoji", () => {
  const { container } = renderEditor();
  expect(
    container.querySelectorAll(".btn, .card, .row, .col, .form-control, .container")
  ).toHaveLength(0);
  expect(container.textContent).not.toMatch(
    /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}]/u
  );
});
