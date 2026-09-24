import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageBubble, { DateSeparator, Message } from "./MessageBubble";

/**
 * The bubble used to be ~200 lines inlined in `ChatContent`'s `.map`, so every
 * keystroke in the composer re-rendered every message in the thread. It is a
 * memoized component now, and this suite pins what it draws: whose side the
 * message is on, the delivery ticks, the date separator, the link card, and
 * lazy images.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const mutation = () => [jest.fn(), { isLoading: false }];

jest.mock("../../store/slices/chatSlice", () => ({
  useTranslateMessageMutation: () => mutation(),
  useSaveMessageVocabularyMutation: () => mutation(),
}));

jest.mock("../../store/slices/learningSlice", () => ({
  useAcceptCorrectionMutation: () => mutation(),
}));

// A child that is always rendered, used as a render counter for the bubble.
const mockRenders = { count: 0 };
jest.mock("./actions/ReactionRow", () => ({
  __esModule: true,
  default: () => {
    mockRenders.count += 1;
    return null;
  },
}));

const message = (extra: Partial<Message> = {}): Message =>
  ({
    _id: "m1",
    message: "hello there",
    createdAt: "2026-09-20T10:00:00.000Z",
    sender: { _id: "me", name: "Me" },
    receiver: { _id: "u2", name: "Ada" },
    ...extra,
  } as Message);

function renderBubble(overrides: any = {}) {
  const props = {
    message: message(),
    isSent: true,
    position: "single" as const,
    isFirstInGroup: true,
    showAvatar: false,
    hideAvatarSpace: false,
    avatarUrl: "/ada.png",
    currentUserId: "me",
    otherUserName: "Ada",
    timeLabel: "10:00",
    isTranslationOpen: false,
    targetLanguage: "en",
    isPlaying: false,
    audioProgress: 0,
    audioElapsed: 0,
    onTogglePlayback: jest.fn(),
    onOpenActions: jest.fn(),
    onToggleReaction: jest.fn(),
    onToggleTranslation: jest.fn(),
    onCorrect: jest.fn(),
    onCorrectionAccepted: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  };
  const view = render(<MessageBubble {...props} />);
  return { ...view, props };
}

const bubble = () => document.querySelector(".modern-message") as HTMLElement;

beforeEach(() => {
  mockRenders.count = 0;
});

describe("memoization", () => {
  it("is wrapped in React.memo", () => {
    expect((MessageBubble as any).$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("does not re-render when the same props come round again", () => {
    const { props, rerender } = renderBubble();
    const after = mockRenders.count;

    rerender(<MessageBubble {...(props as any)} />);
    expect(mockRenders.count).toBe(after);

    // ...and does when its own message changed.
    rerender(
      <MessageBubble {...(props as any)} message={message({ status: "read" })} />
    );
    expect(mockRenders.count).toBe(after + 1);
  });
});

describe("whose message it is", () => {
  it("puts my own message on the sent side with no avatar", () => {
    renderBubble();

    expect(bubble()).toHaveClass("sent");
    expect(document.querySelector(".message-avatar")).toBeNull();
  });

  it("puts the other person's message on the received side with their avatar", () => {
    renderBubble({
      message: message({ sender: { _id: "u2", name: "Ada" } }),
      isSent: false,
      showAvatar: true,
    });

    expect(bubble()).toHaveClass("received");
    const avatar = document.querySelector(".message-avatar img") as HTMLImageElement;
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "/ada.png");
  });

  it("carries the message id for the pinned bar to jump to", () => {
    renderBubble();
    expect(bubble()).toHaveAttribute("data-msg-id", "m1");
  });

  it("renders a system placeholder as a notice, not a bubble", () => {
    renderBubble({ message: message({ message: "Conversation started" }) });

    expect(document.querySelector(".system-notice")).toBeInTheDocument();
    expect(bubble()).toBeNull();
  });
});

describe("delivery ticks", () => {
  it("shows one tick while the message is only sent", () => {
    renderBubble({ message: message({ status: "sent" }) });
    expect(screen.getByTestId("msg-status-sent")).toBeInTheDocument();
    expect(screen.queryByTestId("msg-status-delivered")).not.toBeInTheDocument();
  });

  it("shows the delivered tick once the socket says it arrived", () => {
    renderBubble({ message: message({ status: "delivered" }) });
    expect(screen.getByTestId("msg-status-delivered")).toBeInTheDocument();
  });

  it("marks the message read", () => {
    renderBubble({ message: message({ status: "read" }) });
    expect(screen.getByTestId("msg-status-read")).toBeInTheDocument();
  });

  it("says a message is still going out", () => {
    renderBubble({ message: message({ status: "sending", isOptimistic: true }) });
    expect(screen.getByTestId("msg-status-sending")).toBeInTheDocument();
  });

  it("names the tick for a screen reader", () => {
    renderBubble({ message: message({ status: "read" }) });
    expect(screen.getByTestId("msg-status-read")).toHaveAttribute("aria-label");
  });

  it("never puts ticks on the other person's message", () => {
    renderBubble({
      message: message({ sender: { _id: "u2", name: "Ada" }, status: "read" }),
      isSent: false,
    });
    expect(screen.queryByTestId("msg-status-read")).not.toBeInTheDocument();
  });

  it("offers a retry when sending failed", () => {
    const onRetry = jest.fn();
    renderBubble({ message: message({ status: "error" }), onRetry });

    fireEvent.click(document.querySelector(".retry-btn") as HTMLElement);
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("the date separator", () => {
  it("renders the day above the first message of that day", () => {
    render(<DateSeparator label="Today" />);
    expect(document.querySelector(".date-separator")).toBeInTheDocument();
    expect(screen.getByText("Today")).toHaveClass("date-text");
  });
});

describe("link cards", () => {
  it("shows a card for the first link in a message", () => {
    renderBubble({
      message: message({ message: "read https://bananatalk.app/blog/hello today" }),
    });

    const card = screen.getByTestId("message-link-card");
    expect(card).toHaveAttribute("href", "https://bananatalk.app/blog/hello");
    expect(card).toHaveAttribute("target", "_blank");
    expect(card).toHaveAttribute("rel", "noopener noreferrer");
    expect(card).toHaveTextContent("bananatalk.app");
  });

  it("shows no card when the message has no link", () => {
    renderBubble();
    expect(screen.queryByTestId("message-link-card")).not.toBeInTheDocument();
  });

  it("shows no card on a sticker", () => {
    renderBubble({
      message: message({ message: "https://example.com", messageType: "sticker" }),
    });
    expect(screen.queryByTestId("message-link-card")).not.toBeInTheDocument();
  });
});

describe("images", () => {
  it("loads an image message lazily", () => {
    renderBubble({
      message: message({
        message: "",
        messageType: "image",
        media: { url: "/pic.jpg", type: "image" },
      }),
    });

    const img = document.querySelector(".message-image") as HTMLImageElement;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("loads the avatar lazily too", () => {
    renderBubble({
      message: message({ sender: { _id: "u2", name: "Ada" } }),
      isSent: false,
      showAvatar: true,
    });

    const avatar = document.querySelector(".message-avatar img") as HTMLImageElement;
    expect(avatar).toHaveAttribute("loading", "lazy");
    expect(avatar).toHaveAttribute("decoding", "async");
  });

  it("loads a GIF lazily", () => {
    renderBubble({
      message: message({ message: "https://media.giphy.com/media/x.gif", messageType: "gif" }),
    });

    const gif = document.querySelector(".gif-message") as HTMLImageElement;
    expect(gif).toHaveAttribute("loading", "lazy");
    expect(gif).toHaveAttribute("decoding", "async");
  });
});

describe("what the bubble hands back", () => {
  it("opens the action menu from the overflow button", () => {
    const onOpenActions = jest.fn();
    renderBubble({ onOpenActions });

    fireEvent.click(document.querySelector(".msg-action-trigger") as HTMLElement);
    expect(onOpenActions).toHaveBeenCalledWith(expect.objectContaining({ _id: "m1" }));
  });

  it("gives an optimistic message no action menu", () => {
    renderBubble({ message: message({ isOptimistic: true, status: "sending" }) });
    expect(document.querySelector(".msg-action-trigger")).toBeNull();
  });

  it("offers Correct and Translate on the other person's text", () => {
    const onCorrect = jest.fn();
    const onToggleTranslation = jest.fn();
    renderBubble({
      message: message({ sender: { _id: "u2", name: "Ada" } }),
      isSent: false,
      onCorrect,
      onToggleTranslation,
    });

    fireEvent.click(document.querySelector(".correct-chip") as HTMLElement);
    expect(onCorrect).toHaveBeenCalled();

    fireEvent.click(document.querySelector(".translate-chip") as HTMLElement);
    expect(onToggleTranslation).toHaveBeenCalledWith("m1");
  });

  it("offers neither on my own message", () => {
    renderBubble();
    expect(document.querySelector(".message-chip-row")).toBeNull();
  });
});
