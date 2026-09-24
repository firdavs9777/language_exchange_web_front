import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StoryViewer from "./StoryViewer";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: () => ({ userId: "author-1" }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

let mockCurrentUserId: string | null = "me";
jest.mock("react-redux", () => ({
  useSelector: (selector: any) =>
    selector({ auth: { userInfo: { user: { _id: mockCurrentUserId } } } }),
}));

// The three sheets have their own tests; here they are stubs so this file is
// about what the viewer decides to open, not about what a sheet renders.
jest.mock("./StoryViewersSheet", () => ({
  __esModule: true,
  default: ({ storyId }: any) => (
    <div data-testid="viewers-sheet-stub">{storyId}</div>
  ),
}));
jest.mock("./QuestionResponsesSheet", () => ({
  __esModule: true,
  default: ({ storyId }: any) => (
    <div data-testid="responses-sheet-stub">{storyId}</div>
  ),
}));
jest.mock("./StoryShareSheet", () => ({
  __esModule: true,
  default: ({ storyId, currentUserId }: any) => (
    <div data-testid="share-sheet-stub">{`${storyId}:${currentUserId}`}</div>
  ),
}));

const mockMarkViewed = jest.fn();
const mockReact = jest.fn();
const mockRemoveReaction = jest.fn();
const mockReply = jest.fn();
const mockVote = jest.fn();
const mockDelete = jest.fn();
const mockAnswerQuestion = jest.fn();
let mockStoriesState: any = {};

jest.mock("../../store/slices/storiesSlice", () => ({
  useGetUserStoriesQuery: () => mockStoriesState,
  useMarkIndividualStoryViewedMutation: () => [mockMarkViewed, { isLoading: false }],
  useReactToStoryMutation: () => [mockReact, { isLoading: false }],
  useRemoveReactionMutation: () => [mockRemoveReaction, { isLoading: false }],
  useReplyToStoryMutation: () => [mockReply, { isLoading: false }],
  useVoteOnPollMutation: () => [mockVote, { isLoading: false }],
  useDeleteIndividualStoryMutation: () => [mockDelete, { isLoading: false }],
  useAnswerQuestionMutation: () => [mockAnswerQuestion, { isLoading: false }],
}));

jest.mock("../../design/notify", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const unwrappable = (value: any = {}) => ({ unwrap: () => Promise.resolve(value) });

const story = (overrides: any = {}) => ({
  _id: "story-1",
  user: { _id: "author-1", name: "Mina", imageUrls: ["https://cdn/m.jpg"] },
  mediaType: "text",
  text: "Hello",
  createdAt: "2026-09-24T11:00:00Z",
  reactions: [],
  views: [],
  ...overrides,
});

const renderViewer = (stories: any[]) => {
  mockStoriesState = {
    data: { success: true, data: stories },
    isLoading: false,
    error: undefined,
  };
  return render(<StoryViewer />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUserId = "me";
  [mockMarkViewed, mockReact, mockRemoveReaction, mockReply, mockVote, mockDelete].forEach(
    (fn) => fn.mockReturnValue(unwrappable())
  );
  mockAnswerQuestion.mockReturnValue(unwrappable({ success: true }));
});

describe("question sticker answers", () => {
  const withQuestion = () =>
    renderViewer([story({ questionBox: { prompt: "Ask me anything", responses: [] } })]);

  it("opens an inline answer box and pauses the story while typing", () => {
    withQuestion();
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "false");

    fireEvent.click(screen.getByTestId("story-question-answer"));

    expect(screen.getByTestId("story-answer-input")).toBeInTheDocument();
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "true");
  });

  it("POSTs the answer to the question endpoint, not into the DM reply", async () => {
    withQuestion();
    fireEvent.click(screen.getByTestId("story-question-answer"));
    fireEvent.change(screen.getByTestId("story-answer-input"), {
      target: { value: "Seoul, twice" },
    });
    fireEvent.click(screen.getByTestId("story-answer-submit"));

    await waitFor(() =>
      expect(mockAnswerQuestion).toHaveBeenCalledWith({
        id: "story-1",
        text: "Seoul, twice",
        isAnonymous: false,
      })
    );
    // The bug this replaces: the "Answer" button used to open the generic
    // reply box, which sends a DM.
    expect(mockReply).not.toHaveBeenCalled();
  });

  it("sends anonymously when the toggle is on", async () => {
    withQuestion();
    fireEvent.click(screen.getByTestId("story-question-answer"));
    fireEvent.change(screen.getByTestId("story-answer-input"), {
      target: { value: "Kimchi" },
    });
    fireEvent.click(screen.getByTestId("story-answer-anonymous"));
    fireEvent.click(screen.getByTestId("story-answer-submit"));

    await waitFor(() =>
      expect(mockAnswerQuestion).toHaveBeenCalledWith({
        id: "story-1",
        text: "Kimchi",
        isAnonymous: true,
      })
    );
  });

  it("shows a success state and resumes the story once the answer lands", async () => {
    withQuestion();
    fireEvent.click(screen.getByTestId("story-question-answer"));
    fireEvent.change(screen.getByTestId("story-answer-input"), {
      target: { value: "Seoul" },
    });
    fireEvent.click(screen.getByTestId("story-answer-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("story-answer-sent")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("story-answer-input")).not.toBeInTheDocument();
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "false");
  });

  it("refuses to send an empty answer", () => {
    withQuestion();
    fireEvent.click(screen.getByTestId("story-question-answer"));
    fireEvent.click(screen.getByTestId("story-answer-submit"));
    expect(mockAnswerQuestion).not.toHaveBeenCalled();
  });

  it("gives the owner the responses sheet instead of an answer box", () => {
    mockCurrentUserId = "author-1";
    withQuestion();
    expect(screen.queryByTestId("story-question-answer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("story-responses-button"));
    expect(screen.getByTestId("responses-sheet-stub")).toHaveTextContent("story-1");
  });
});

describe("reactions", () => {
  it("adds a reaction with POST /react", async () => {
    renderViewer([story()]);
    fireEvent.click(screen.getByTestId("story-reaction-toggle"));
    fireEvent.click(screen.getByTestId("story-reaction-🔥"));

    await waitFor(() =>
      expect(mockReact).toHaveBeenCalledWith({ storyId: "story-1", emoji: "🔥" })
    );
    expect(mockRemoveReaction).not.toHaveBeenCalled();
  });

  it("takes an existing reaction back with DELETE /react, not another POST", async () => {
    renderViewer([
      story({ reactions: [{ user: { _id: "me" }, emoji: "🔥", reactedAt: "" }] }),
    ]);
    fireEvent.click(screen.getByTestId("story-reaction-toggle"));
    fireEvent.click(screen.getByTestId("story-reaction-🔥"));

    await waitFor(() =>
      expect(mockRemoveReaction).toHaveBeenCalledWith({
        storyId: "story-1",
        emoji: "🔥",
      })
    );
    // POST does not toggle server-side; sending it again would have left the
    // reaction in place while the UI cleared it.
    expect(mockReact).not.toHaveBeenCalled();
  });

  it("swaps one emoji for another with a POST", async () => {
    renderViewer([
      story({ reactions: [{ user: { _id: "me" }, emoji: "🔥", reactedAt: "" }] }),
    ]);
    fireEvent.click(screen.getByTestId("story-reaction-toggle"));
    fireEvent.click(screen.getByTestId("story-reaction-😂"));

    await waitFor(() =>
      expect(mockReact).toHaveBeenCalledWith({ storyId: "story-1", emoji: "😂" })
    );
    expect(mockRemoveReaction).not.toHaveBeenCalled();
  });
});

describe("owner tools and sharing", () => {
  it("hides the viewers button from everyone but the owner", () => {
    renderViewer([story()]);
    expect(screen.queryByTestId("story-viewers-button")).not.toBeInTheDocument();
  });

  it("opens the viewers sheet for the owner", () => {
    mockCurrentUserId = "author-1";
    renderViewer([story()]);
    fireEvent.click(screen.getByTestId("story-viewers-button"));
    expect(screen.getByTestId("viewers-sheet-stub")).toHaveTextContent("story-1");
  });

  it("pauses the story while a sheet is open", () => {
    mockCurrentUserId = "author-1";
    renderViewer([story()]);
    fireEvent.click(screen.getByTestId("story-viewers-button"));
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "true");
  });

  it("opens the share sheet for any viewer, with the signed-in user", () => {
    renderViewer([story()]);
    fireEvent.click(screen.getByTestId("story-share-button"));
    expect(screen.getByTestId("share-sheet-stub")).toHaveTextContent("story-1:me");
  });

  it("does not offer a responses button on a story with no question", () => {
    mockCurrentUserId = "author-1";
    renderViewer([story()]);
    expect(screen.queryByTestId("story-responses-button")).not.toBeInTheDocument();
  });
});

describe("keyboard", () => {
  const twoStories = () =>
    renderViewer([
      story({ _id: "story-1", text: "One" }),
      story({ _id: "story-2", text: "Two" }),
    ]);

  it("steps forward and back with the arrow keys", () => {
    twoStories();
    expect(screen.getByTestId("story-text")).toHaveTextContent("One");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("story-text")).toHaveTextContent("Two");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("story-text")).toHaveTextContent("One");
  });

  it("pauses and resumes on Space", () => {
    twoStories();
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "false");

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "true");
    // The bar is the clock, so a pause has to reach it.
    expect(screen.getByTestId("story-progress-active")).toHaveAttribute("data-running", "false");

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "false");
  });

  it("forgets a pause when the reader moves to the next story", () => {
    twoStories();
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "false");
  });

  it("closes the viewer on Escape", () => {
    twoStories();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockNavigate).toHaveBeenCalledWith("/stories");
  });

  it("closes only the sheet when Escape arrives with a sheet open", () => {
    mockCurrentUserId = "author-1";
    renderViewer([story()]);
    fireEvent.click(screen.getByTestId("story-viewers-button"));
    expect(screen.getByTestId("viewers-sheet-stub")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    // The viewer stands down and lets DialogShell (which owns the sheet's own
    // Escape) handle it; leaving the whole viewer would throw away the story
    // the owner was looking at along with the list they opened.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("story-viewer")).toBeInTheDocument();
  });

  it("leaves Escape to the answer box while one is being typed", () => {
    renderViewer([story({ questionBox: { prompt: "Ask me anything", responses: [] } })]);
    fireEvent.click(screen.getByTestId("story-question-answer"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("types a space into a field instead of pausing", () => {
    renderViewer([story({ questionBox: { prompt: "Ask me anything", responses: [] } })]);
    fireEvent.click(screen.getByTestId("story-question-answer"));
    const input = screen.getByTestId("story-answer-input");
    fireEvent.keyDown(input, { key: " " });
    // Still paused because the box is open -- not because Space toggled it;
    // the proof is that a second Space does not un-pause the story.
    fireEvent.keyDown(input, { key: " " });
    expect(screen.getByTestId("story-viewer")).toHaveAttribute("data-paused", "true");
  });
});

describe("structured stickers", () => {
  it("paints overlays at their normalized positions with their own styling", () => {
    renderViewer([
      story({
        overlays: [
          {
            type: "text",
            content: "Seoul, 6am",
            x: 0.25,
            y: 0.9,
            scale: 2.5,
            color: "#FF3B30",
            fontStyle: "bold",
            bgMode: "semi",
          },
          { type: "emoji", content: "🔥", x: 1, y: 0, scale: 1, color: "#FFFFFF", fontStyle: "sans-serif", bgMode: "none" },
        ],
      }),
    ]);

    const first = screen.getByTestId("story-overlay-0");
    expect(first).toHaveTextContent("Seoul, 6am");
    // The two coordinates are the only inline style; 0.25/0.9 of the canvas.
    expect(first).toHaveStyle({ left: "25%", top: "90%", color: "#FF3B30" });
    expect(first.className).toContain("font-bold");
    expect(first.className).toContain("text-4xl");

    expect(screen.getByTestId("story-overlay-1")).toHaveStyle({ left: "100%", top: "0%" });
  });

  it("clamps a position the server would have clamped anyway", () => {
    renderViewer([
      story({
        overlays: [
          { type: "text", content: "x", x: 5, y: -3, scale: 1, color: "#FFFFFF", fontStyle: "serif", bgMode: "none" },
        ],
      }),
    ]);
    expect(screen.getByTestId("story-overlay-0")).toHaveStyle({ left: "100%", top: "0%" });
  });

  it("renders mentions as pills that link to the member page", () => {
    renderViewer([
      story({
        mentions: [
          { user: { _id: "u-9", name: "Ann" }, username: "ann", position: { x: 50, y: 80 } },
          { user: "u-10", username: "bo", position: { x: 10, y: 10 } },
        ],
      }),
    ]);
    const pill = screen.getByTestId("story-mention-0");
    expect(pill).toHaveTextContent("@ann");
    expect(pill).toHaveAttribute("href", "/community/u-9");
    // 0-100 on the wire, percentages on screen.
    expect(pill).toHaveStyle({ left: "50%", top: "80%" });
    // An unpopulated mention is still a link.
    expect(screen.getByTestId("story-mention-1")).toHaveAttribute("href", "/community/u-10");
  });

  it("opens the link sticker in a new tab without handing it this one", () => {
    renderViewer([
      story({ link: { url: "https://example.com/sale", title: "", displayText: "Shop", host: "example.com" } }),
    ]);
    const sticker = screen.getByTestId("story-link-sticker");
    expect(sticker).toHaveTextContent("Shop");
    expect(sticker).toHaveAttribute("href", "https://example.com/sale");
    expect(sticker).toHaveAttribute("target", "_blank");
    expect(sticker.getAttribute("rel")).toContain("noopener");
  });

  it("falls back to the real host when the author gave no label", () => {
    renderViewer([
      story({ link: { url: "https://example.com/sale", title: "", displayText: "", host: "example.com" } }),
    ]);
    expect(screen.getByTestId("story-link-sticker")).toHaveTextContent("example.com");
  });
});
