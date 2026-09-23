import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ProfileActions from "./ProfileActions";

const mockNavigate = jest.fn();
const mockFollow = jest.fn();
const mockUnfollow = jest.fn();
const mockBlock = jest.fn();
const mockReport = jest.fn();
const mockCreateChatRoom = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../../store/slices/usersSlice", () => ({
  useFollowUserMutation: () => [mockFollow, { isLoading: false }],
  useUnFollowUserMutation: () => [mockUnfollow, { isLoading: false }],
  useBlockUserMutation: () => [mockBlock, { isLoading: false }],
  useReportUserMutation: () => [mockReport, { isLoading: false }],
}));

jest.mock("../../../store/slices/chatSlice", () => ({
  useCreateChatRoomMutation: () => [mockCreateChatRoom, { isLoading: false }],
}));

const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });
const rejected = () => ({ unwrap: () => Promise.reject(new Error("nope")) });
const pending = () => ({ unwrap: () => new Promise(() => undefined) });

// `null`, not `undefined`: an undefined argument would fall back to the
// default parameter and quietly sign the viewer back in.
function renderActions(props: any = {}, viewerId: string | null = "me") {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: viewerId ? { user: { _id: viewerId } } : null }) => state,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ProfileActions userId="u2" isOwn={false} name="Ada" {...props} />
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  mockFollow.mockReturnValue(resolved());
  mockUnfollow.mockReturnValue(resolved());
  mockBlock.mockReturnValue(resolved());
  mockReport.mockReturnValue(resolved());
  mockCreateChatRoom.mockReturnValue(resolved());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("own profile", () => {
  it("offers edit profile and settings, and nothing social", () => {
    renderActions({ isOwn: true, userId: "me" });
    expect(screen.getByTestId("action-edit-profile")).toHaveAttribute("href", "/profile/edit");
    expect(screen.getByTestId("action-settings")).toHaveAttribute("href", "/settings");
    expect(screen.queryByTestId("action-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-follow")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-more")).not.toBeInTheDocument();
  });
});

describe("another user's profile", () => {
  it("offers message, follow and an overflow menu", () => {
    renderActions();
    expect(screen.getByTestId("action-message")).toHaveTextContent("Message");
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Follow");
    expect(screen.getByTestId("action-more")).toBeInTheDocument();
    expect(screen.queryByTestId("action-edit-profile")).not.toBeInTheDocument();
  });

  it("opens the chat the way the community page does", async () => {
    renderActions();
    fireEvent.click(screen.getByTestId("action-message"));
    expect(mockCreateChatRoom).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/chat/u2"));
  });

  it("still opens the chat screen when creating the room fails", async () => {
    mockCreateChatRoom.mockReturnValue(rejected());
    renderActions();
    fireEvent.click(screen.getByTestId("action-message"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/chat/u2"));
  });

  it("sends a logged-out viewer to the login screen instead", () => {
    renderActions({}, null);
    fireEvent.click(screen.getByTestId("action-message"));
    expect(mockCreateChatRoom).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("flips to Following before the mutation resolves", () => {
    mockFollow.mockReturnValue(pending());
    renderActions();
    fireEvent.click(screen.getByTestId("action-follow"));
    expect(mockFollow).toHaveBeenCalledWith({ userId: "me", targetUserId: "u2" });
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Following");
    expect(screen.getByTestId("action-follow")).toHaveAttribute("aria-pressed", "true");
  });

  it("rolls back to Follow when the mutation fails", async () => {
    mockFollow.mockReturnValue(rejected());
    renderActions();
    fireEvent.click(screen.getByTestId("action-follow"));
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Following");
    await waitFor(() =>
      expect(screen.getByTestId("action-follow")).toHaveTextContent("Follow")
    );
    expect(screen.getByTestId("action-follow")).toHaveAttribute("aria-pressed", "false");
  });

  it("unfollows optimistically and reports the new state", async () => {
    const onFollowChanged = jest.fn();
    renderActions({ isFollowing: true, onFollowChanged });
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Following");
    fireEvent.click(screen.getByTestId("action-follow"));
    expect(mockUnfollow).toHaveBeenCalledWith({ userId: "me", targetUserId: "u2" });
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Follow");
    await waitFor(() => expect(onFollowChanged).toHaveBeenCalledWith(false));
  });

  it("adopts a follow state that arrives after the first render", () => {
    const { rerender } = renderActions({ isFollowing: false });
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Follow");
    rerender(
      <Provider
        store={configureStore({
          reducer: { auth: (s: any = { userInfo: { user: { _id: "me" } } }) => s },
        })}
      >
        <MemoryRouter>
          <ProfileActions userId="u2" isOwn={false} name="Ada" isFollowing />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByTestId("action-follow")).toHaveTextContent("Following");
  });

  it("blocks only after the confirm dialog is confirmed", async () => {
    renderActions();
    fireEvent.click(screen.getByTestId("action-more"));
    fireEvent.click(screen.getByTestId("action-block"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(mockBlock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockBlock).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument());
  });

  it("leaves the block dialog open when the mutation fails", async () => {
    mockBlock.mockReturnValue(rejected());
    renderActions();
    fireEvent.click(screen.getByTestId("action-more"));
    fireEvent.click(screen.getByTestId("action-block"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(screen.getByTestId("confirm-dialog-error")).toBeInTheDocument());
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("reports with the reason the dialog collected", async () => {
    renderActions();
    fireEvent.click(screen.getByTestId("action-more"));
    fireEvent.click(screen.getByTestId("action-report"));
    const confirm = screen.getByTestId("confirm-dialog-confirm");
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId("confirm-dialog-reason"), {
      target: { value: "harassment" },
    });
    fireEvent.click(confirm);
    expect(mockReport).toHaveBeenCalledWith({ userId: "u2", reason: "harassment" });
    await waitFor(() => expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument());
  });

  it("closes the overflow menu once an action is chosen", () => {
    renderActions();
    fireEvent.click(screen.getByTestId("action-more"));
    expect(screen.getByTestId("action-report")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("action-block"));
    expect(screen.queryByTestId("action-report")).not.toBeInTheDocument();
  });

  it("closes the overflow menu on Escape", () => {
    renderActions();
    fireEvent.click(screen.getByTestId("action-more"));
    expect(screen.getByTestId("action-block")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("action-block")).not.toBeInTheDocument();
  });
});
