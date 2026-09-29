import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ChatContent from "./ChatContent";

// The first test in src/components/chat. It exists for one behaviour: a
// conversation starter from the profile page arrives as ?draft= and has to
// survive the mount -- the clear-on-switch effect also fires on mount, so
// effect ORDER is the whole story here and nothing else in this file's 2000
// lines can catch a regression in it.
//
// CRA's jest config resets mocks between tests, so every factory below is
// module-scoped and `mock`-prefixed (the only names jest.mock's factory may
// close over).
const mockUseSocket = jest.fn();
const mockGetConversation = jest.fn();
const mockInvalidateTags = jest.fn();
const mockCreateMessage = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("./hooks/useSocket", () => ({
  useSocket: () => mockUseSocket(),
}));

const mutation = () => [jest.fn(), { isLoading: false }];

jest.mock("../../store/slices/chatSlice", () => ({
  chatApiSlice: { util: { invalidateTags: (tags: any) => mockInvalidateTags(tags) } },
  useGetConversationQuery: (arg: any, opts: any) => mockGetConversation(arg, opts),
  // ForwardDialog, mounted (closed) by ChatContent.
  useGetConversationsQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateMessageMutation: () => [mockCreateMessage, { isLoading: false }],
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
}));

jest.mock("../../store/slices/learningSlice", () => ({
  useSendCorrectionMutation: () => mutation(),
}));

// The panel has its own suite (ChatInfoPanel.test.tsx) and its own store
// hooks; here only the header's job matters -- that "⋯" opens it.
jest.mock("./ChatInfoPanel", () => ({
  __esModule: true,
  default: () =>
    require("react").createElement("div", { "data-testid": "chat-info-panel" }),
}));

/** Pushes a ?draft= onto the URL long after the chat has mounted. */
const DraftInjector: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button type="button" data-testid="inject-draft" onClick={() => navigate("/chat/u2?draft=late+opener")}>
      inject
    </button>
  );
};

/** Reads the live URL back out of the router. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

function renderChat(entry: string) {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: { user: { _id: "me", name: "Me" }, token: "t" } }) => state,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <DraftInjector />
        <ChatContent selectedUser="u2" userName="Ada" profilePicture="" />
      </MemoryRouter>
    </Provider>
  );
}

// jsdom has no layout, so it has no scrollIntoView -- and the thread scrolls
// itself to the bottom every time a message lands.
if (!(window.HTMLElement.prototype as any).scrollIntoView) {
  (window.HTMLElement.prototype as any).scrollIntoView = () => {};
}

/** The composer input, found the way a person finds it. */
function messageBox(): HTMLInputElement {
  return screen.getByPlaceholderText("Message...") as HTMLInputElement;
}

beforeEach(() => {
  mockUseSocket.mockReturnValue({ socket: null, isConnected: false, emit: jest.fn() });
  mockGetConversation.mockReturnValue({ data: undefined, error: undefined, isLoading: false });
  // CRA resets mocks between tests, implementations included -- and this one
  // has to return a real action, because the component dispatches it.
  mockInvalidateTags.mockImplementation((tags: any) => ({
    type: "chatApi/invalidateTags",
    payload: tags,
  }));
  mockCreateMessage.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { _id: "m-rest", message: "hi", sender: { _id: "me" } } }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

it("puts a conversation starter in the message box on arrival", async () => {
  renderChat("/chat/u2?draft=Hello%20Ada!");

  await waitFor(() => expect(messageBox()).toHaveValue("Hello Ada!"));
});

it("takes the draft back out of the URL once it has landed", async () => {
  renderChat("/chat/u2?draft=Hello%20Ada!");

  await waitFor(() => expect(messageBox()).toHaveValue("Hello Ada!"));
  expect(screen.getByTestId("location-search")).not.toHaveTextContent("draft");
});

it("keeps the rest of the query string", async () => {
  renderChat("/chat/u2?draft=Hi&from=profile");

  await waitFor(() => expect(messageBox()).toHaveValue("Hi"));
  expect(screen.getByTestId("location-search")).toHaveTextContent("from=profile");
});

it("never overwrites text the viewer has already typed", async () => {
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "my own words" } });
  expect(messageBox()).toHaveValue("my own words");

  // A draft arriving after the box is dirty loses to what is in it -- and is
  // still taken off the URL, so it cannot come back on the next render.
  fireEvent.click(screen.getByTestId("inject-draft"));

  await waitFor(() =>
    expect(screen.getByTestId("location-search")).not.toHaveTextContent("draft")
  );
  expect(messageBox()).toHaveValue("my own words");
});

it("seeds once -- a second draft in the same conversation is ignored", async () => {
  renderChat("/chat/u2?draft=first");

  await waitFor(() => expect(messageBox()).toHaveValue("first"));
  // The viewer decides against it and empties the box.
  fireEvent.change(messageBox(), { target: { value: "" } });

  fireEvent.click(screen.getByTestId("inject-draft"));

  // The ref has already fired, so the effect is inert: nothing is re-seeded
  // into a box the viewer deliberately cleared.
  await waitFor(() =>
    expect(screen.getByTestId("location-search")).toHaveTextContent("draft=late")
  );
  expect(messageBox()).toHaveValue("");
});

it("leaves the box empty when no starter was passed", async () => {
  renderChat("/chat/u2");

  await waitFor(() => expect(messageBox()).toHaveValue(""));
});

// --- The header ------------------------------------------------------------
//
// The name and the avatar were plain text and a plain <img> with no handler,
// and "⋯" was a button with no onClick: three of the four things the app's
// chat header does were unreachable on the web.

it("sends the header name and avatar to the other person's member page", () => {
  renderChat("/chat/u2");

  expect(screen.getByTestId("chat-header-profile-link")).toHaveAttribute(
    "href",
    "/community/u2"
  );
  expect(screen.getByTestId("chat-header-avatar-link")).toHaveAttribute(
    "href",
    "/community/u2"
  );
});

it("names the profile link for a screen reader", () => {
  renderChat("/chat/u2");

  expect(screen.getByTestId("chat-header-profile-link")).toHaveAttribute("aria-label");
});

it("opens the info panel from the header's overflow button", () => {
  renderChat("/chat/u2");

  const more = screen.getByTestId("chat-header-more");
  expect(more).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByTestId("chat-info-panel")).not.toBeInTheDocument();

  fireEvent.click(more);

  expect(screen.getByTestId("chat-info-panel")).toBeInTheDocument();
  expect(screen.getByTestId("chat-header-more")).toHaveAttribute("aria-expanded", "true");
});

// --- The conversation list, after this tab sends ---------------------------
//
// The sidebar and the navbar badge live off socket events, and `messageSent`
// is the one they refetch on. The server emits it with
// `socket.to(`user_<id>`)` (socket/socketHandler.js), and socket.io's `.to()`
// on a SOCKET excludes the socket doing the sending -- it is meant for the
// sender's other devices. So the phone updated, the second tab updated, and
// the one place the message was actually typed kept showing the previous last
// message in the previous row order until something else happened to refetch.
//
// The server-side half of that is fixed too (io.to, so the sender's own socket
// is included), but the REST fallback path never emitted anything at all and a
// client should not need a deploy to show its own message. Every send route --
// socket ack, REST fallback, reply, sticker, GIF, media, voice -- lands on
// `finalizeOptimistic`, so the invalidation lives there, once.

/** A socket whose sendMessage ack succeeds, like a healthy connection. */
function ackingSocket() {
  const on = jest.fn();
  const off = jest.fn();
  const emit = jest.fn((event: string, _data: any, cb?: (r: any) => void) => {
    if (event === "sendMessage" && cb) {
      cb({ status: "success", message: { _id: "m1", message: "hi", sender: { _id: "me" } } });
    }
  });
  return { socket: { on, off, emit, connected: true }, isConnected: true, emit: jest.fn() };
}

/** A socket that is present but not connected, so sends go over REST. */
function offlineSocket() {
  return {
    socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), connected: false },
    isConnected: false,
    emit: jest.fn(),
  };
}

it("refreshes the conversation list after a message goes out over the socket", async () => {
  mockUseSocket.mockReturnValue(ackingSocket());
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() => expect(mockInvalidateTags).toHaveBeenCalled());
  expect(mockInvalidateTags).toHaveBeenCalledWith(["Conversations", "UserMessages"]);
});

it("refreshes it after the REST fallback too", async () => {
  mockUseSocket.mockReturnValue(offlineSocket());
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() =>
    expect(mockInvalidateTags).toHaveBeenCalledWith(["Conversations", "UserMessages"])
  );
});

it("does not refresh it for a send that failed", async () => {
  mockUseSocket.mockReturnValue(offlineSocket());
  mockCreateMessage.mockReturnValue({ unwrap: () => Promise.reject(new Error("offline")) });
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() => expect(mockCreateMessage).toHaveBeenCalled());
  expect(mockInvalidateTags).not.toHaveBeenCalled();
});

// --- The sender now hears its own messageSent ------------------------------
//
// The server used to address `messageSent` with `socket.to(...)`, which skips
// the socket that sent. It now uses `io.to(...)`, so the sending tab gets it
// as well — which is the whole point, the conversation list refetches on it.
//
// That means the same message can arrive twice on this tab: once as the ack
// that replaces the optimistic bubble, once as the event. Socket.io writes the
// ack first, so in practice the event finds the real id already there and only
// upgrades the tick. If the ack is lost, though, the event must adopt the
// optimistic bubble rather than land beside it.

/** A socket that records its listeners and never answers a sendMessage. */
function silentSocket() {
  const handlers: Record<string, Function[]> = {};
  return {
    handlers,
    value: {
      socket: {
        connected: true,
        on: (event: string, fn: Function) => {
          (handlers[event] = handlers[event] || []).push(fn);
        },
        off: (event: string, fn: Function) => {
          handlers[event] = (handlers[event] || []).filter((f) => f !== fn);
        },
        emit: jest.fn(),
      },
      isConnected: true,
      emit: jest.fn(),
    },
  };
}

const renderedIds = (): string[] =>
  Array.from(document.querySelectorAll("[data-msg-id]")).map(
    (el) => el.getAttribute("data-msg-id") as string
  );

it("adopts the pending bubble when messageSent beats the ack", async () => {
  const s = silentSocket();
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);
  await waitFor(() => expect(renderedIds()).toHaveLength(1));

  // The ack never came; the server's own push arrives instead.
  s.handlers["messageSent"].forEach((fn) =>
    fn({
      message: { _id: "m-real", message: "hello", sender: { _id: "me" }, receiver: "u2" },
      receiverId: "u2",
    })
  );

  await waitFor(() => expect(renderedIds()).toEqual(["m-real"]));
});

it("only upgrades the tick when the ack already landed", async () => {
  const s = silentSocket();
  s.value.socket.emit = jest.fn((event: string, _d: any, cb?: (r: any) => void) => {
    if (event === "sendMessage" && cb) {
      cb({ status: "success", message: { _id: "m-real", message: "hello", sender: { _id: "me" } } });
    }
  }) as any;
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);
  await waitFor(() => expect(renderedIds()).toEqual(["m-real"]));

  s.handlers["messageSent"].forEach((fn) =>
    fn({
      message: { _id: "m-real", message: "hello", sender: { _id: "me" }, receiver: "u2" },
      receiverId: "u2",
    })
  );

  expect(renderedIds()).toEqual(["m-real"]);
});
