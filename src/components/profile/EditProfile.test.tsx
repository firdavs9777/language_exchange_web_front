import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  createMemoryRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import EditProfile from "./EditProfile";

const mockGetUserProfile = jest.fn();
const mockUpdate = jest.fn();
const mockUpload = jest.fn();
const mockDeletePhoto = jest.fn();
const mockNavigate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

// The date picker is a third-party widget with its own stylesheet; the editor
// only cares that the callback lands, so it stands in as a plain input.
jest.mock("react-datepicker", () => ({
  __esModule: true,
  default: (props: any) => (
    <input
      data-testid="edit-birthday"
      onChange={(event: any) => props.onChange(new Date(event.target.value))}
    />
  ),
}));
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}), { virtual: true });

jest.mock("react-toastify", () => ({
  Bounce: "bounce",
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

jest.mock("../../store/slices/usersSlice", () => ({
  useGetUserProfileQuery: (arg: any) => mockGetUserProfile(arg),
  useUpdateUserInfoMutation: () => [mockUpdate, { isLoading: false }],
  useUploadUserPhotoMutation: () => [mockUpload, { isLoading: false }],
  useDeleteUserPhotoMutation: () => [mockDeletePhoto, { isLoading: false }],
}));

jest.mock("../../store/slices/authSlice", () => ({
  setCredentials: (payload: any) => ({ type: "auth/setCredentials", payload }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const refetch = jest.fn();
const resolved = (value: any = { success: true }) => ({
  unwrap: () => Promise.resolve(value),
});
const rejected = (error: any = { data: { message: "nope" } }) => ({
  unwrap: () => Promise.reject(error),
});

const USER = {
  _id: "me",
  name: "Ada",
  username: "ada",
  email: "ada@example.com",
  gender: "Female",
  bio: "Hello",
  native_language: "Korean",
  language_to_learn: "English",
  languageLevel: "B1",
  occupation: "Engineer",
  school: "KAIST",
  mbti: "INTJ",
  bloodType: "A",
  topics: ["music"],
  imageUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"],
};

function renderEditor(data: any = { data: USER }, loading = false) {
  mockGetUserProfile.mockReturnValue({ data, isLoading: loading, refetch });
  const store = configureStore({
    reducer: { auth: (state: any = { userInfo: { user: { _id: "me" } } }) => state },
  });
  // A data router, because the unsaved-changes guard is useBlocker — which
  // only exists inside one. src/index.tsx mounts the app the same way.
  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route path="/">
        <Route path="profile/edit" element={<EditProfile />} />
        <Route path="profile" element={<div data-testid="profile-screen" />} />
      </Route>
    ),
    { initialEntries: ["/profile/edit"] }
  );
  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockReturnValue(resolved());
  mockUpload.mockReturnValue(resolved());
  mockDeletePhoto.mockReturnValue(resolved());
});

describe("layout", () => {
  it("renders the four sections", () => {
    renderEditor();
    expect(screen.getByTestId("edit-photos")).toBeInTheDocument();
    expect(screen.getByTestId("edit-basics")).toBeInTheDocument();
    expect(screen.getByTestId("edit-languages")).toBeInTheDocument();
    expect(screen.getByTestId("edit-about")).toBeInTheDocument();
  });

  it("fills every field from the loaded document, About included", () => {
    renderEditor();
    expect((screen.getByTestId("edit-name") as HTMLInputElement).value).toBe("Ada");
    expect((screen.getByTestId("edit-occupation") as HTMLInputElement).value).toBe(
      "Engineer"
    );
    expect((screen.getByTestId("edit-school") as HTMLInputElement).value).toBe("KAIST");
    expect(screen.getByTestId("edit-level-B1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("edit-mbti-INTJ")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("edit-blood-A")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("edit-topic-music")).toHaveAttribute("aria-pressed", "true");
    // Gender arrives capitalised from the API and still matches.
    expect(screen.getByTestId("edit-gender-female")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows a spinner instead of an empty form while the profile loads", () => {
    renderEditor(undefined, true);
    expect(screen.getByTestId("edit-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-basics")).not.toBeInTheDocument();
  });

  it("uses no react-bootstrap markup and no emoji", () => {
    const { container } = renderEditor();
    expect(container.querySelectorAll(".btn, .card, .row, .col, .form-control")).toHaveLength(
      0
    );
    expect(container.textContent).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}]/u
    );
  });
});

describe("saving", () => {
  it("keeps Save disabled until something actually changes", () => {
    renderEditor();
    expect(screen.getByTestId("edit-save")).toBeDisabled();

    fireEvent.change(screen.getByTestId("edit-occupation"), {
      target: { name: "occupation", value: "Teacher" },
    });
    expect(screen.getByTestId("edit-save")).not.toBeDisabled();
  });

  it("goes clean again when an edit is undone", () => {
    renderEditor();
    const bio = screen.getByTestId("edit-bio");
    fireEvent.change(bio, { target: { name: "bio", value: "Hello!" } });
    expect(screen.getByTestId("edit-save")).not.toBeDisabled();

    fireEvent.change(bio, { target: { name: "bio", value: "Hello" } });
    expect(screen.getByTestId("edit-save")).toBeDisabled();
  });

  it("sends the edited fields, gender lowercased, and leaves for the profile", async () => {
    renderEditor();
    fireEvent.change(screen.getByTestId("edit-school"), {
      target: { name: "school", value: "SNU" },
    });
    fireEvent.click(screen.getByTestId("edit-level-C1"));
    fireEvent.click(screen.getByTestId("edit-topic-travel"));
    fireEvent.click(screen.getByTestId("edit-save"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][0];
    expect(payload.school).toBe("SNU");
    expect(payload.occupation).toBe("Engineer");
    expect(payload.languageLevel).toBe("C1");
    expect(payload.topics).toEqual(["music", "travel"]);
    expect(payload.gender).toBe("female");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
  });

  it("stays on the form and says so when the save is rejected", async () => {
    mockUpdate.mockReturnValue(rejected());
    renderEditor();
    fireEvent.change(screen.getByTestId("edit-name"), {
      target: { name: "name", value: "Ada L" },
    });
    fireEvent.click(screen.getByTestId("edit-save"));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("edit-save")).not.toBeDisabled();
  });
});

describe("photos", () => {
  it("uploads the chosen files against the signed-in user", async () => {
    const { container } = renderEditor();
    const input = container.querySelector(
      '[data-testid="edit-photo-add"] input'
    ) as HTMLInputElement;
    const file = new File(["x"], "me.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    expect(mockUpload.mock.calls[0][0].userId).toBe("me");
    expect(mockUpload.mock.calls[0][0].imageFiles).toBeInstanceOf(FormData);
  });

  it("hides the add tile once the limit is reached", () => {
    const full = ["1", "2", "3", "4", "5", "6"].map((n) => `https://cdn.test/${n}.jpg`);
    renderEditor({ data: { ...USER, imageUrls: full } });
    expect(screen.getAllByTestId("edit-photo")).toHaveLength(6);
    expect(screen.queryByTestId("edit-photo-add")).not.toBeInTheDocument();
  });

  it("deletes a photo only after the confirmation is accepted", async () => {
    renderEditor();
    fireEvent.click(screen.getByTestId("edit-photo-delete-1"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(mockDeletePhoto).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() =>
      expect(mockDeletePhoto).toHaveBeenCalledWith({ userId: "me", index: 1 })
    );
  });

  it("keeps the dialog open with the failure when the delete is rejected", async () => {
    mockDeletePhoto.mockReturnValue(rejected());
    renderEditor();
    fireEvent.click(screen.getByTestId("edit-photo-delete-0"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(screen.getByTestId("confirm-dialog-error")).toBeInTheDocument()
    );
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });
});

describe("unsaved changes", () => {
  it("lets a clean form leave without a word", async () => {
    renderEditor();
    fireEvent.click(screen.getByTestId("edit-cancel"));
    await waitFor(() => expect(screen.getByTestId("profile-screen")).toBeInTheDocument());
  });

  it("stops a dirty form leaving, and stays put when the edit is kept", async () => {
    renderEditor();
    fireEvent.change(screen.getByTestId("edit-name"), {
      target: { name: "name", value: "Ada L" },
    });
    fireEvent.click(screen.getByTestId("edit-cancel"));

    await waitFor(() => expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument());
    expect(screen.queryByTestId("profile-screen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));
    await waitFor(() =>
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("edit-basics")).toBeInTheDocument();
  });

  it("leaves once the changes are discarded", async () => {
    renderEditor();
    fireEvent.change(screen.getByTestId("edit-name"), {
      target: { name: "name", value: "Ada L" },
    });
    fireEvent.click(screen.getByTestId("edit-cancel"));
    await waitFor(() => expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(screen.getByTestId("profile-screen")).toBeInTheDocument());
  });

  it("warns before the tab is closed only while there are changes", () => {
    const add = jest.spyOn(window, "addEventListener");
    renderEditor();
    expect(add.mock.calls.filter((call) => call[0] === "beforeunload")).toHaveLength(0);

    fireEvent.change(screen.getByTestId("edit-name"), {
      target: { name: "name", value: "Ada L" },
    });
    expect(
      add.mock.calls.filter((call) => call[0] === "beforeunload").length
    ).toBeGreaterThan(0);
    add.mockRestore();
  });
});
