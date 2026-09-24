import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ChatContent from "./ChatContent";

/**
 * The web chat asked the backend for one page of 50 messages and stopped
 * there: on a longer thread everything older was unreachable. This suite
 * covers the way back — the sentinel above the first message asks for the
 * previous page, the older messages land ABOVE what is on screen, and the
 * thread does not jump under the reader while they land.
 *
 * `useGetConversationQuery` is mocked to answer the way the merged cache
 * entry does: page 1 is the newest page, and once page 2 has been asked for
 * the entry holds both, oldest first.
 */
const mockUseSocket = jest.fn();
const mockGetConversation = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("./hooks/useSocket", () => ({
  useSocket: () => mockUseSocket(),
}));

const mutation = () => [jest.fn(), { isLoading: false }];

jest.mock("../../store/slices/chatSlice", () => ({
  useGetConversationQuery: (arg: any, opts: any) => mockGetConversation(arg, opts),
  useGetConversationsQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateMessageMutation: () => mutation(),
  useSendVoiceMessageMutation: () => mutation(),
  useSendMediaMessageMutation: () => mutation(),
  useEditMessageMutation: () => mutation(),
  useDeleteMessageMutation: () => mutation(),
  useAddReactionMutation: () => mutation(),
  useRemoveReactionMutation: () => mutation(),
  usePinMessageMutation: () => mutation(),
  useBookmarkMessageMutation: () => mutation(),
  useForwardMessageMutation: () => mutation(),
  useReplyToMessageMutation: () => mutation(),
  useTtsMessageMutation: () => mutation(),
  useTranslateMessageMutation: () => mutation(),
  useSaveMessageVocabularyMutation: () => mutation(),
}));

jest.mock("../../store/slices/learningSlice", () => ({
  useSendCorrectionMutation: () => mutation(),
  useAcceptCorrectionMutation: () => mutation(),
}));

jest.mock("./ChatInfoPanel", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", null),
}));

const msg = (id: string, createdAt: string, own = false) => ({
  _id: id,
  message: id,
  createdAt,
  sender: own ? { _id: "me", name: "Me" } : { _id: "u2", name: "Ada" },
  receiver: own ? { _id: "u2", name: "Ada" } : { _id: "me", name: "Me" },
});

const OWN_PAGE_1 = [
  msg("newer-a", "2026-09-20T10:00:00.000Z", true),
  msg("newer-b", "2026-09-20T10:05:00.000Z", true),
];

const PAGE_1 = [
  msg("newer-a", "2026-09-20T10:00:00.000Z"),
  msg("newer-b", "2026-09-20T10:05:00.000Z"),
];
const PAGE_2 = [
  msg("older-a", "2026-09-19T10:00:00.000Z"),
  msg("older-b", "2026-09-19T10:05:00.000Z"),
];

const response = (data: any[], totalPages: number, total: number) => ({
  success: true,
  count: data.length,
  total,
  pagination: { currentPage: 1, totalPages, limit: 2, hasNextPage: true, hasPrevPage: false },
  data,
});

/**
 * The merged cache entry, as a function of the page asked for — exactly what
 * `getConversation`'s `merge` builds.
 */
function answerWith(
  options: {
    totalPages?: number;
    fetchingOlder?: boolean;
    total?: number;
    own?: boolean;
  } = {}
) {
  const totalPages = options.totalPages === undefined ? 2 : options.totalPages;
  const total = options.total === undefined ? 4 : options.total;
  // One STABLE object per page, the way RTK Query hands the same cache entry
  // back until it actually changes. A fresh object per render would restart
  // the effect that seeds the message list on every pass.
  const newest = {
    data: response(options.own ? OWN_PAGE_1 : PAGE_1, totalPages, total),
    error: undefined,
    isLoading: false,
    isFetching: false,
  };
  const merged = {
    data: response(PAGE_2.concat(PAGE_1), totalPages, total),
    error: undefined,
    isLoading: false,
    isFetching: !!options.fetchingOlder,
  };
  mockGetConversation.mockImplementation((arg: any) => (arg.page >= 2 ? merged : newest));
}

const liveMessage = (id: string) => ({
  _id: id,
  message: id,
  createdAt: "2026-09-20T12:00:00.000Z",
  sender: { _id: "u2", name: "Ada" },
  receiver: { _id: "me", name: "Me" },
});

/** A socket whose events a test can fire, the way the server would. */
function fakeSocket() {
  const handlers: { [event: string]: Function[] } = {};
  return {
    connected: true,
    on: (event: string, handler: Function) => {
      (handlers[event] = handlers[event] || []).push(handler);
    },
    off: (event: string, handler: Function) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== handler);
    },
    emit: jest.fn(),
    fire: (event: string, payload: any) => {
      act(() => {
        (handlers[event] || []).slice().forEach((h) => h(payload));
      });
    },
  };
}

/** Every IntersectionObserver the component makes, so a test can trip one. */
let observerCallbacks: Array<(entries: any[]) => void> = [];

function installIntersectionObserver() {
  observerCallbacks = [];
  (window as any).IntersectionObserver = class {
    constructor(cb: (entries: any[]) => void) {
      observerCallbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function scrollTheSentinelIntoView() {
  // The live observer is the last one made; the component disconnects the
  // others on cleanup.
  act(() => {
    const cb = observerCallbacks[observerCallbacks.length - 1];
    if (cb) cb([{ isIntersecting: true }]);
  });
}

function renderChat() {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: { user: { _id: "me", name: "Me" }, token: "t" } }) => state,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/chat/u2"]}>
        <ChatContent selectedUser="u2" userName="Ada" profilePicture="/ada.png" />
      </MemoryRouter>
    </Provider>
  );
}

const renderedIds = (): string[] =>
  Array.from(document.querySelectorAll("[data-msg-id]")).map(
    (el) => el.getAttribute("data-msg-id") as string
  );

const pagesAskedFor = (): number[] => mockGetConversation.mock.calls.map((c) => c[0].page);

beforeEach(() => {
  // jsdom has no layout and no scrollIntoView.
  (Element.prototype as any).scrollIntoView = jest.fn();
  installIntersectionObserver();
  mockUseSocket.mockReturnValue({ socket: null, isConnected: false, emit: jest.fn() });
  answerWith();
});

afterEach(() => {
  jest.clearAllMocks();
});

it("asks for the newest page first", () => {
  renderChat();

  expect(mockGetConversation).toHaveBeenCalledWith(
    expect.objectContaining({ senderId: "me", receiverId: "u2", page: 1, limit: 50 }),
    expect.anything()
  );
});

it("offers no way back when the whole thread is already loaded", () => {
  // Two messages held, two in the thread: there is nothing older.
  answerWith({ totalPages: 1, total: 2 });
  renderChat();

  expect(screen.queryByTestId("load-earlier")).not.toBeInTheDocument();
});

it("asks for page 2 when the top sentinel scrolls into view, and stops there", async () => {
  renderChat();

  scrollTheSentinelIntoView();
  scrollTheSentinelIntoView();

  await waitFor(() => expect(pagesAskedFor()).toContain(2));
  expect(pagesAskedFor().some((p) => p > 2)).toBe(false);
});

it("asks for page 2 from the button too, for keyboards and browsers without an observer", async () => {
  renderChat();

  fireEvent.click(screen.getByTestId("load-earlier"));

  await waitFor(() => expect(pagesAskedFor()).toContain(2));
});

it("says earlier messages are on their way while the page is in flight", async () => {
  answerWith({ fetchingOlder: true });
  renderChat();

  fireEvent.click(screen.getByTestId("load-earlier"));

  await waitFor(() => expect(screen.getByTestId("loading-earlier")).toBeInTheDocument());
  expect(screen.queryByTestId("load-earlier")).not.toBeInTheDocument();
});

it("puts the older page ABOVE what was already on screen", async () => {
  renderChat();
  expect(renderedIds()).toEqual(["newer-a", "newer-b"]);

  fireEvent.click(screen.getByTestId("load-earlier"));

  await waitFor(() =>
    expect(renderedIds()).toEqual(["older-a", "older-b", "newer-a", "newer-b"])
  );
});

it("keeps the reader where they were when the older page lands", async () => {
  renderChat();

  // jsdom has no layout. The anchor — the first message on screen — sits at
  // 100px until the older page is actually in the DOM, and at 1,600px after,
  // i.e. 1,500px of history was inserted above it.
  (Element.prototype as any).getBoundingClientRect = function () {
    const id = this.getAttribute && this.getAttribute("data-msg-id");
    const prepended = document.querySelectorAll("[data-msg-id]").length > 2;
    const top = id === "newer-a" ? (prepended ? 1600 : 100) : 0;
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top };
  };

  const container = document.querySelector(".modern-chat-messages") as HTMLElement;
  Object.defineProperty(container, "scrollHeight", { configurable: true, value: 2500 });
  Object.defineProperty(container, "clientHeight", { configurable: true, value: 400 });
  let scrollTop = 40;
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });

  fireEvent.click(screen.getByTestId("load-earlier"));

  await waitFor(() => expect(scrollTop).toBe(1540));
});

it("does not spend the scroll restore on a message that arrives at the bottom", async () => {
  const socket = fakeSocket();
  mockUseSocket.mockReturnValue({ socket, isConnected: true, emit: socket.emit });
  renderChat();

  // The anchor never moves: everything that changes happens below it.
  (Element.prototype as any).getBoundingClientRect = function () {
    const id = this.getAttribute && this.getAttribute("data-msg-id");
    const top = id === "newer-a" ? 100 : 0;
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top };
  };
  const container = document.querySelector(".modern-chat-messages") as HTMLElement;
  Object.defineProperty(container, "scrollHeight", { configurable: true, value: 2500 });
  Object.defineProperty(container, "clientHeight", { configurable: true, value: 400 });
  let scrollTop = 40;
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });

  fireEvent.click(screen.getByTestId("load-earlier"));
  socket.fire("newMessage", {
    message: liveMessage("live-1"),
    unreadCount: 1,
    senderId: "u2",
  });

  await waitFor(() => expect(renderedIds()).toContain("live-1"));
  // A message appended at the bottom is not a prepend: the scroller stays put.
  expect(scrollTop).toBe(40);
});

// --- Live messages and ticks ------------------------------------------------

it("keeps socket and optimistic messages when a page of history lands", async () => {
  const socket = fakeSocket();
  mockUseSocket.mockReturnValue({ socket, isConnected: true, emit: socket.emit });
  renderChat();

  socket.fire("newMessage", {
    message: liveMessage("live-1"),
    unreadCount: 1,
    senderId: "u2",
  });
  await waitFor(() => expect(renderedIds()).toContain("live-1"));

  fireEvent.click(screen.getByTestId("load-earlier"));

  // The cache knows nothing of `live-1`; seeding from it must not drop it.
  await waitFor(() =>
    expect(renderedIds()).toEqual(["older-a", "older-b", "newer-a", "newer-b", "live-1"])
  );
});

it("raises one tick to two when the socket says the message was delivered", async () => {
  const socket = fakeSocket();
  mockUseSocket.mockReturnValue({ socket, isConnected: true, emit: socket.emit });
  answerWith({ own: true });
  renderChat();

  // Straight from the cache, an own message the server holds is ONE tick.
  await waitFor(() => expect(screen.getAllByTestId("msg-status-sent").length).toBe(2));

  socket.fire("messageDelivered", { messageId: "newer-a" });

  await waitFor(() => expect(screen.getByTestId("msg-status-delivered")).toBeInTheDocument());
});

it("never pulls a read receipt back to delivered", async () => {
  const socket = fakeSocket();
  mockUseSocket.mockReturnValue({ socket, isConnected: true, emit: socket.emit });
  answerWith({ own: true });
  renderChat();

  socket.fire("messagesRead", { readBy: "u2" });
  await waitFor(() => expect(screen.getAllByTestId("msg-status-read").length).toBe(2));

  socket.fire("messageDelivered", { messageId: "newer-a" });

  expect(screen.getAllByTestId("msg-status-read").length).toBe(2);
  expect(screen.queryByTestId("msg-status-delivered")).not.toBeInTheDocument();
});

// --- The header (H1 review follow-up) --------------------------------------
it("announces one profile link, not the same one twice", () => {
  renderChat();

  const avatarLink = screen.getByTestId("chat-header-avatar-link");
  expect(avatarLink).toHaveAttribute("aria-hidden", "true");
  expect(avatarLink).toHaveAttribute("tabindex", "-1");
  expect(avatarLink).not.toHaveAttribute("aria-label");
  expect(screen.getByTestId("chat-header-profile-link")).toHaveAttribute("aria-label");
});
