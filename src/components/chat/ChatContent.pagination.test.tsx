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

const msg = (id: string, createdAt: string) => ({
  _id: id,
  message: id,
  createdAt,
  sender: { _id: "u2", name: "Ada" },
  receiver: { _id: "me", name: "Me" },
});

const PAGE_1 = [
  msg("newer-a", "2026-09-20T10:00:00.000Z"),
  msg("newer-b", "2026-09-20T10:05:00.000Z"),
];
const PAGE_2 = [
  msg("older-a", "2026-09-19T10:00:00.000Z"),
  msg("older-b", "2026-09-19T10:05:00.000Z"),
];

const response = (data: any[], totalPages: number) => ({
  success: true,
  count: data.length,
  total: 4,
  pagination: { currentPage: 1, totalPages, limit: 2, hasNextPage: true, hasPrevPage: false },
  data,
});

/**
 * The merged cache entry, as a function of the page asked for — exactly what
 * `getConversation`'s `merge` builds.
 */
function answerWith(options: { totalPages?: number; fetchingOlder?: boolean } = {}) {
  const totalPages = options.totalPages === undefined ? 2 : options.totalPages;
  // One STABLE object per page, the way RTK Query hands the same cache entry
  // back until it actually changes. A fresh object per render would restart
  // the effect that seeds the message list on every pass.
  const newest = {
    data: response(PAGE_1, totalPages),
    error: undefined,
    isLoading: false,
    isFetching: false,
  };
  const merged = {
    data: response(PAGE_2.concat(PAGE_1), totalPages),
    error: undefined,
    isLoading: false,
    isFetching: !!options.fetchingOlder,
  };
  mockGetConversation.mockImplementation((arg: any) => (arg.page >= 2 ? merged : newest));
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
  answerWith({ totalPages: 1 });
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

  // jsdom has no layout, so the scroller's geometry is stubbed: 1,000px tall
  // when the older page is asked for, 2,500px once it has been prepended.
  const container = document.querySelector(".modern-chat-messages") as HTMLElement;
  let heights = [1000, 2500];
  let read = 0;
  Object.defineProperty(container, "scrollHeight", {
    configurable: true,
    get: () => heights[Math.min(read++, heights.length - 1)],
  });
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

  // Everything prepended (2500 - 1000) is added to where the reader was (40),
  // so the message they were reading is still under their eyes.
  await waitFor(() => expect(scrollTop).toBe(1540));
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
