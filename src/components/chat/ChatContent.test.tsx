import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
const mockUpdateQueryData = jest.fn();
const mockCreateMessage = jest.fn();
const mockEditMessage = jest.fn();
const mockDeleteMessage = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("./hooks/useSocket", () => ({
  useSocket: () => mockUseSocket(),
}));

const mutation = () => [jest.fn(), { isLoading: false }];

jest.mock("../../store/slices/chatSlice", () => ({
  chatApiSlice: {
    util: {
      invalidateTags: (tags: any) => mockInvalidateTags(tags),
      updateQueryData: (...args: any[]) => mockUpdateQueryData(...args),
    },
  },
  useGetConversationQuery: (arg: any, opts: any) => mockGetConversation(arg, opts),
  // ForwardDialog, mounted (closed) by ChatContent.
  useGetConversationsQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateMessageMutation: () => [mockCreateMessage, { isLoading: false }],
  useSendVoiceMessageMutation: () => mutation(),
  useSendMediaMessageMutation: () => mutation(),
  useEditMessageMutation: () => [mockEditMessage, { isLoading: false }],
  useDeleteMessageMutation: () => [mockDeleteMessage, { isLoading: false }],
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
  mockUpdateQueryData.mockImplementation(() => ({ type: "chatApi/updateQueryData" }));
  mockCreateMessage.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { _id: "m-rest", message: "hi", sender: { _id: "me" } } }),
  });
  mockEditMessage.mockReturnValue({ unwrap: () => Promise.resolve({ success: true, data: {} }) });
  mockDeleteMessage.mockReturnValue({ unwrap: () => Promise.resolve({ success: true, data: {} }) });
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

// --- A message you SENT has to survive leaving the room --------------------
//
// Reported: send "hi" to A, switch to B and send "hello", come back to A and
// "hi" is gone, only the older messages are there.
//
// Incoming messages were written into the thread cache when they arrived, but
// the confirmed message from our own send was not — it landed in local state
// and in the two LIST queries and nowhere else. Local state is rebuilt from
// the thread cache wholesale on a conversation switch, so our own message was
// the one thing that could not survive the round trip out of the room.

it("writes a message we sent into the thread cache, over the socket", async () => {
  mockUseSocket.mockReturnValue(ackingSocket());
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() =>
    expect(mockUpdateQueryData).toHaveBeenCalledWith(
      "getConversation",
      expect.objectContaining({ senderId: "me", receiverId: "u2" }),
      expect.any(Function)
    )
  );
});

it("writes it when the send fell back to REST too", async () => {
  mockUseSocket.mockReturnValue(offlineSocket());
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() =>
    expect(mockUpdateQueryData).toHaveBeenCalledWith(
      "getConversation",
      expect.objectContaining({ senderId: "me", receiverId: "u2" }),
      expect.any(Function)
    )
  );
});

it("does not write a send that failed", async () => {
  mockUseSocket.mockReturnValue(offlineSocket());
  mockCreateMessage.mockReturnValue({ unwrap: () => Promise.reject(new Error("offline")) });
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() => expect(mockCreateMessage).toHaveBeenCalled());
  expect(mockUpdateQueryData).not.toHaveBeenCalled();
});
// --- Editing a message -----------------------------------------------------
//
// The web sent PUT /messages/:id {content}; the backend reads `message`, so
// every edit was a 400 that only reached the console. And it asked through
// window.prompt, which a browser can suppress and no locale can style.

/** One message of mine, sent just now, already in the thread. */
function threadWithMyMessage() {
  mockGetConversation.mockReturnValue({
    data: {
      data: [
        {
          _id: "m-mine",
          message: "helo",
          messageType: "text",
          sender: { _id: "me", name: "Me" },
          receiver: "u2",
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    },
    error: undefined,
    isLoading: false,
  });
}

function openActionsOn(id: string) {
  const bubble = document.querySelector(`[data-msg-id="${id}"]`) as HTMLElement;
  fireEvent.contextMenu(bubble);
}

it("edits in an in-app dialog and sends the field the backend reads", async () => {
  const promptSpy = jest.spyOn(window, "prompt").mockImplementation(() => null);
  threadWithMyMessage();
  renderChat("/chat/u2");
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-mine"]')).not.toBe(null));

  openActionsOn("m-mine");
  fireEvent.click(screen.getByTestId("action-edit"));

  expect(promptSpy).not.toHaveBeenCalled();
  fireEvent.change(screen.getByTestId("edit-message-input"), { target: { value: "hello" } });
  fireEvent.click(screen.getByTestId("edit-message-save"));

  await waitFor(() =>
    expect(mockEditMessage).toHaveBeenCalledWith({ messageId: "m-mine", message: "hello" })
  );
  await waitFor(() => expect(screen.queryByTestId("edit-message-dialog")).not.toBeInTheDocument());
  expect(document.querySelector('[data-msg-id="m-mine"]')).toHaveTextContent("hello");
  promptSpy.mockRestore();
});

it("keeps the dialog open and says why when the 15 minutes are up", async () => {
  mockEditMessage.mockReturnValue({
    unwrap: () =>
      Promise.reject({ status: 400, data: { success: false, error: "Message can only be edited within 15 minutes" } }),
  });
  threadWithMyMessage();
  renderChat("/chat/u2");
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-mine"]')).not.toBe(null));

  openActionsOn("m-mine");
  fireEvent.click(screen.getByTestId("action-edit"));
  fireEvent.change(screen.getByTestId("edit-message-input"), { target: { value: "hello" } });
  fireEvent.click(screen.getByTestId("edit-message-save"));

  await waitFor(() =>
    expect(screen.getByTestId("edit-message-error")).toHaveTextContent("within 15 minutes")
  );
  expect(document.querySelector('[data-msg-id="m-mine"]')).toHaveTextContent("helo");
});

// --- Deleting a message ----------------------------------------------------

it("deletes for everyone with the body flag and leaves the app's placeholder", async () => {
  const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
  threadWithMyMessage();
  renderChat("/chat/u2");
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-mine"]')).not.toBe(null));

  openActionsOn("m-mine");
  fireEvent.click(screen.getByTestId("action-delete"));
  expect(confirmSpy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("delete-for-everyone"));

  await waitFor(() =>
    expect(mockDeleteMessage).toHaveBeenCalledWith({ messageId: "m-mine", forEveryone: true })
  );
  await waitFor(() => expect(screen.getByTestId("message-deleted-placeholder")).toBeInTheDocument());
  confirmSpy.mockRestore();
});

it("delete for me removes the bubble", async () => {
  threadWithMyMessage();
  renderChat("/chat/u2");
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-mine"]')).not.toBe(null));

  openActionsOn("m-mine");
  fireEvent.click(screen.getByTestId("action-delete"));
  fireEvent.click(screen.getByTestId("delete-for-me"));

  await waitFor(() =>
    expect(mockDeleteMessage).toHaveBeenCalledWith({ messageId: "m-mine", forEveryone: false })
  );
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-mine"]')).toBe(null));
});

it("turns a message the other person deleted for everyone into the placeholder", async () => {
  const s = silentSocket();
  mockUseSocket.mockReturnValue(s.value);
  mockGetConversation.mockReturnValue({
    data: {
      data: [{ _id: "m-theirs", message: "oops", sender: { _id: "u2", name: "Ada" }, receiver: "me", createdAt: new Date().toISOString() }],
      total: 1,
    },
    error: undefined,
    isLoading: false,
  });
  renderChat("/chat/u2");
  await waitFor(() => expect(document.querySelector('[data-msg-id="m-theirs"]')).not.toBe(null));

  act(() => {
    s.handlers["messageDeleted"].forEach((fn) =>
      fn({ messageId: "m-theirs", deletedForEveryone: true, message: { _id: "m-theirs", message: "This message was deleted", isDeleted: true } })
    );
  });

  await waitFor(() => expect(screen.getByTestId("message-deleted-placeholder")).toBeInTheDocument());
  expect(document.querySelector('[data-msg-id="m-theirs"]')).not.toBe(null);
});

// --- Refusals the user can act on ------------------------------------------

it("shows the first-chat limit as a dialog when REST answers 429", async () => {
  mockUseSocket.mockReturnValue(offlineSocket());
  mockCreateMessage.mockReturnValue({
    unwrap: () =>
      Promise.reject({
        status: 429,
        data: { success: false, error: "You can only send 5 messages until they reply. Please wait for a response." },
      }),
  });
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() => expect(screen.getByTestId("send-error-dialog")).toHaveTextContent("until they reply"));
  expect(screen.getByTestId("msg-status-error")).toBeInTheDocument();
});

it("shows the burst limiter's refusal (no ack arrives for it)", async () => {
  const s = silentSocket();
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hi" } });
  fireEvent.submit(messageBox().closest("form")!);
  act(() => {
    s.handlers["messageSendError"].forEach((fn) => fn({ error: "Too many messages — slow down." }));
  });

  await waitFor(() => expect(screen.getByTestId("msg-status-error")).toBeInTheDocument());
});

// --- A slow ack is not a reason to send twice --------------------------------
//
// After 5 s without an ack the web re-sent the same text over REST. The
// server had already created the first copy (it creates before it acks), so
// the app user got the message twice.

it("marks the bubble failed after the ack timeout and sends nothing over REST", async () => {
  jest.useFakeTimers();
  const s = silentSocket();
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);
  act(() => {
    jest.advanceTimersByTime(10000);
  });

  expect(screen.getByTestId("msg-status-error")).toBeInTheDocument();
  expect(mockCreateMessage).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it("a late ack turns the failed bubble into the real message, once", async () => {
  jest.useFakeTimers();
  const s = silentSocket();
  let ack: (r: any) => void = () => undefined;
  s.value.socket.emit = jest.fn((event: string, _d: any, cb?: (r: any) => void) => {
    if (event === "sendMessage" && cb) ack = cb;
  }) as any;
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);
  act(() => {
    jest.advanceTimersByTime(10000);
  });
  act(() => {
    ack({ status: "success", message: { _id: "m-real", message: "hello", sender: { _id: "me" } } });
  });

  expect(renderedIds()).toEqual(["m-real"]);
  jest.useRealTimers();
});

it("a late messageSent adopts the failed bubble instead of adding a second", async () => {
  jest.useFakeTimers();
  const s = silentSocket();
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);
  act(() => {
    jest.advanceTimersByTime(10000);
  });
  act(() => {
    s.handlers["messageSent"].forEach((fn) =>
      fn({ message: { _id: "m-real", message: "hello", sender: { _id: "me" }, receiver: "u2" }, receiverId: "u2" })
    );
  });

  expect(renderedIds()).toEqual(["m-real"]);
  jest.useRealTimers();
});

it("a refusal ack fails the bubble and explains it, without REST", async () => {
  const s = silentSocket();
  s.value.socket.emit = jest.fn((event: string, _d: any, cb?: (r: any) => void) => {
    if (event === "sendMessage" && cb) cb({ status: "error", error: "Cannot send message to blocked user" });
  }) as any;
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.change(messageBox(), { target: { value: "hello" } });
  fireEvent.submit(messageBox().closest("form")!);

  await waitFor(() => expect(screen.getByTestId("send-error-dialog")).toBeInTheDocument());
  expect(screen.getByTestId("msg-status-error")).toBeInTheDocument();
  expect(mockCreateMessage).not.toHaveBeenCalled();
});

it("Retry re-sends a failed sticker as a sticker", async () => {
  const s = silentSocket();
  const sends: any[] = [];
  s.value.socket.emit = jest.fn((event: string, d: any, cb?: (r: any) => void) => {
    if (event !== "sendMessage" || !cb) return;
    sends.push(d);
    if (sends.length === 1) cb({ status: "error", error: "boom" });
    else cb({ status: "success", message: { _id: "m-ok", message: d.message, messageType: d.messageType, sender: { _id: "me" } } });
  }) as any;
  mockUseSocket.mockReturnValue(s.value);
  renderChat("/chat/u2");

  fireEvent.click(screen.getByLabelText("Stickers"));
  // "Recent" is empty in a fresh browser; open the first real category.
  const tabs = document.querySelectorAll(".sticker-tab");
  fireEvent.click(tabs[tabs.length > 1 ? 1 : 0] as HTMLElement);
  fireEvent.click(document.querySelector(".sticker-item") as HTMLElement);
  await waitFor(() => expect(screen.getByTestId("msg-status-error")).toBeInTheDocument());

  fireEvent.click(screen.getByText("Retry"));
  await waitFor(() => expect(sends).toHaveLength(2));
  expect(sends[1].messageType).toBe("sticker");
});
