import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ChatInfoPanel from "./ChatInfoPanel";

// CRA resets mocks between tests, so every factory is module-scoped and
// `mock`-prefixed (the only names a jest.mock factory may close over) and the
// implementations are handed out in beforeEach.
const mockNavigate = jest.fn();
const mockConversations = jest.fn();
const mockBlockStatus = jest.fn();
const mockMute = jest.fn();
const mockUnmute = jest.fn();
const mockDelete = jest.fn();
const mockBlock = jest.fn();
const mockUnblock = jest.fn();
const mockReport = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../store/slices/chatSlice", () => ({
  useGetConversationsQuery: (arg: any, opts: any) => mockConversations(arg, opts),
  useMuteConversationMutation: () => [mockMute, { isLoading: false }],
  useUnmuteConversationMutation: () => [mockUnmute, { isLoading: false }],
  useDeleteConversationMutation: () => [mockDelete, { isLoading: false }],
}));

jest.mock("../../store/slices/usersSlice", () => ({
  useGetBlockStatusQuery: (arg: any, opts: any) => mockBlockStatus(arg, opts),
  useBlockUserMutation: () => [mockBlock, { isLoading: false }],
  useUnblockUserMutation: () => [mockUnblock, { isLoading: false }],
  useReportUserMutation: () => [mockReport, { isLoading: false }],
}));

const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });
const rejected = () => ({ unwrap: () => Promise.reject({ data: { message: "nope" } }) });

const onClose = jest.fn();

function renderPanel(props: any = {}) {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: { user: { _id: "me" }, token: "t" } }) => state,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ChatInfoPanel
          userId="u2"
          userName="Ada"
          profilePicture=""
          onClose={onClose}
          {...props}
        />
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  mockConversations.mockReturnValue({
    data: {
      data: [
        { _id: "c1", participants: [{ _id: "me" }, { _id: "u2" }], isMuted: false },
        { _id: "c9", participants: [{ _id: "me" }, { _id: "u7" }], isMuted: true },
      ],
    },
    isLoading: false,
  });
  mockBlockStatus.mockReturnValue({ data: { data: { isBlocked: false } } });
  mockMute.mockReturnValue(resolved());
  mockUnmute.mockReturnValue(resolved());
  mockDelete.mockReturnValue(resolved());
  mockBlock.mockReturnValue(resolved());
  mockUnblock.mockReturnValue(resolved());
  mockReport.mockReturnValue(resolved());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("the entries the panel offers", () => {
  it("links the profile and the media gallery by the OTHER USER's id", () => {
    renderPanel();
    expect(screen.getByTestId("chat-info-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chat-info-profile")).toHaveAttribute("href", "/community/u2");
    expect(screen.getByTestId("chat-info-media")).toHaveAttribute("href", "/chat/u2/media");
  });

  it("closes on the close button", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("carries a wallpaper entry that is not wired yet, and says so", () => {
    renderPanel();
    expect(screen.getByTestId("chat-info-wallpaper")).toBeDisabled();
  });
});

describe("mute", () => {
  it("mutes the conversation this pair actually has", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-mute"));
    expect(mockMute).toHaveBeenCalledWith({ conversationId: "c1" });
    await waitFor(() => expect(mockMute).toHaveBeenCalledTimes(1));
  });

  it("unmutes when the conversation is already muted", async () => {
    mockConversations.mockReturnValue({
      data: {
        data: [{ _id: "c1", participants: [{ _id: "me" }, { _id: "u2" }], isMuted: true }],
      },
      isLoading: false,
    });
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-mute"));
    expect(mockUnmute).toHaveBeenCalledWith("c1");
    expect(mockMute).not.toHaveBeenCalled();
  });

  it("disables mute and delete until a conversation document exists", () => {
    mockConversations.mockReturnValue({ data: { data: [] }, isLoading: false });
    renderPanel();
    expect(screen.getByTestId("chat-info-mute")).toBeDisabled();
    expect(screen.getByTestId("chat-info-delete")).toBeDisabled();
  });
});

describe("block and unblock", () => {
  it("blocks behind a confirmation and leaves the conversation", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-block"));
    expect(mockBlock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockBlock).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/chat"));
  });

  it("offers Unblock while the live status says blocked", async () => {
    mockBlockStatus.mockReturnValue({ data: { data: { isBlocked: true } } });
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-block"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockUnblock).toHaveBeenCalledWith("u2");
    expect(mockBlock).not.toHaveBeenCalled();
    // Unblocking keeps you where you are -- there is a conversation to read.
    await waitFor(() => expect(mockUnblock).toHaveBeenCalledTimes(1));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("asks for the block status of this pair", () => {
    renderPanel();
    expect(mockBlockStatus).toHaveBeenCalledWith(
      { userId: "me", targetUserId: "u2" },
      expect.objectContaining({ skip: false })
    );
  });
});

describe("report", () => {
  it("sends the reason the picker collected in the body the backend accepts", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-report"));
    fireEvent.change(screen.getByTestId("chat-report-reason"), {
      target: { value: "harassment" },
    });
    fireEvent.change(screen.getByTestId("chat-report-description"), {
      target: { value: "kept messaging after I asked them to stop" },
    });
    fireEvent.submit(screen.getByTestId("chat-report-form"));
    expect(mockReport).toHaveBeenCalledWith({
      type: "user",
      reportedUser: "u2",
      reason: "harassment",
      description: "kept messaging after I asked them to stop",
    });
    await waitFor(() =>
      expect(screen.queryByTestId("chat-report-form")).not.toBeInTheDocument()
    );
  });

  it("only offers reasons the Report model's enum accepts", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-report"));
    const values = Array.prototype.slice
      .call(screen.getByTestId("chat-report-reason").querySelectorAll("option"))
      .map((o: any) => o.value);
    expect(values).toEqual([
      "spam",
      "harassment",
      "hate_speech",
      "violence",
      "nudity",
      "false_information",
      "copyright",
      "other",
    ]);
  });

  it("keeps the form open when the report is rejected", async () => {
    mockReport.mockReturnValue(rejected());
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-report"));
    fireEvent.submit(screen.getByTestId("chat-report-form"));
    await waitFor(() => expect(mockReport).toHaveBeenCalled());
    expect(screen.getByTestId("chat-report-form")).toBeInTheDocument();
  });
});

describe("delete", () => {
  it("deletes behind a confirmation and returns to the list", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-delete"));
    expect(mockDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockDelete).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/chat"));
  });

  it("stays put when the delete fails", async () => {
    mockDelete.mockReturnValue(rejected());
    renderPanel();
    fireEvent.click(screen.getByTestId("chat-info-delete"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(mockDelete).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
