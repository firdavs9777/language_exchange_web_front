import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import UsersList from "./UsersList";
import { CONVERSATIONS_PAGE } from "./lib/conversationMatch";

// CRA resets mocks between tests: module-scoped, `mock`-prefixed factories,
// implementations handed out in beforeEach.
const mockUseSocket = jest.fn();
const mockUserMessages = jest.fn();
const mockConversations = jest.fn();
const mockDelete = jest.fn();
const mockPin = jest.fn();
const mockUnpin = jest.fn();
const mockMute = jest.fn();
const mockUnmute = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("./hooks/useSocket", () => ({
  useSocket: () => mockUseSocket(),
}));

jest.mock("../../store/slices/chatSlice", () => ({
  useGetUserMessagesQuery: (arg: any, opts: any) => mockUserMessages(arg, opts),
  useGetConversationsQuery: (arg: any, opts: any) => mockConversations(arg, opts),
  useDeleteConversationMutation: () => [mockDelete, { isLoading: false }],
  usePinConversationMutation: () => [mockPin, { isLoading: false }],
  useUnpinConversationMutation: () => [mockUnpin, { isLoading: false }],
  useMuteConversationMutation: () => [mockMute, { isLoading: false }],
  useUnmuteConversationMutation: () => [mockUnmute, { isLoading: false }],
}));

const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });

const onSelectUser = jest.fn();

function conversation(overrides: any = {}) {
  return {
    _id: "c1",
    participants: [
      { _id: "me", name: "Me", images: [] },
      { _id: "u2", name: "Ada", images: [] },
    ],
    lastMessage: { message: "hi", createdAt: "2026-09-20T10:00:00.000Z" },
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    ...overrides,
  };
}

function renderList() {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: { user: { _id: "me", name: "Me" }, token: "t" } }) =>
        state,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <UsersList onSelectUser={onSelectUser} activeUserId={null} />
      </MemoryRouter>
    </Provider>
  );
}

beforeEach(() => {
  mockUseSocket.mockReturnValue({ socket: null, isConnected: false });
  mockUserMessages.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockConversations.mockReturnValue({
    data: { data: [conversation()] },
    refetch: jest.fn(),
  });
  mockMute.mockReturnValue(resolved());
  mockUnmute.mockReturnValue(resolved());
  mockDelete.mockReturnValue(resolved());
});

afterEach(() => {
  jest.clearAllMocks();
});

it("asks for conversations with the argument the info panel shares", () => {
  renderList();
  expect(mockConversations).toHaveBeenCalledWith(
    CONVERSATIONS_PAGE,
    expect.objectContaining({ skip: false })
  );
});

it("resolves the conversation through the shared matcher, otherParticipant first", () => {
  mockConversations.mockReturnValue({
    data: {
      data: [
        {
          _id: "c1",
          otherParticipant: { _id: "u2", name: "Ada", images: [] },
          participants: [
            { _id: "me", name: "Me", images: [] },
            { _id: "u2", name: "Ada", images: [] },
          ],
          isMuted: false,
        },
      ],
    },
    refetch: jest.fn(),
  });
  renderList();
  fireEvent.click(screen.getByTestId("users-list-menu-u2"));
  fireEvent.click(screen.getByTestId("users-list-mute-u2"));
  expect(mockMute).toHaveBeenCalledWith({ conversationId: "c1" });
});

it("sends the row's avatar to the member page without opening the chat", () => {
  renderList();
  const link = screen.getByTestId("users-list-avatar-link-u2");
  expect(link).toHaveAttribute("href", "/community/u2");

  fireEvent.click(link);
  expect(onSelectUser).not.toHaveBeenCalled();
});

it("still opens the chat when the row itself is clicked", () => {
  renderList();
  fireEvent.click(screen.getByText("Ada"));
  expect(onSelectUser).toHaveBeenCalledWith("u2", "Ada", "", false, undefined);
});

it("mutes a conversation from the row's menu", async () => {
  renderList();
  fireEvent.click(screen.getByTestId("users-list-menu-u2"));
  fireEvent.click(screen.getByTestId("users-list-mute-u2"));
  expect(mockMute).toHaveBeenCalledWith({ conversationId: "c1" });
  await waitFor(() => expect(mockMute).toHaveBeenCalledTimes(1));
});

it("unmutes one that is already muted", async () => {
  mockConversations.mockReturnValue({
    data: { data: [conversation({ isMuted: true })] },
    refetch: jest.fn(),
  });
  renderList();
  fireEvent.click(screen.getByTestId("users-list-menu-u2"));
  fireEvent.click(screen.getByTestId("users-list-mute-u2"));
  expect(mockUnmute).toHaveBeenCalledWith("c1");
  expect(mockMute).not.toHaveBeenCalled();
});

it("asks the delete question as one sentence with the name inside it", () => {
  renderList();
  fireEvent.click(screen.getByTestId("users-list-menu-u2"));
  fireEvent.click(screen.getByTestId("users-list-delete-u2"));

  // One interpolated sentence, not a prefix concatenated with a <strong> --
  // the fragment could not be translated into a language that puts the name
  // anywhere but last.
  expect(screen.getByTestId("users-list-delete-body")).toHaveTextContent(
    "Delete your conversation with Ada?"
  );
});
