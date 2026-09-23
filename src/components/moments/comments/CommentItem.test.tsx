import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CommentItem from "./CommentItem";

const mockLikeComment = jest.fn();
const mockReactToComment = jest.fn();
const mockUnreactToComment = jest.fn();
const mockTranslateComment = jest.fn();
const mockDeleteComment = jest.fn();
const mockAddComment = jest.fn();
const mockUploadImage = jest.fn();
let mockRepliesResult: any = { data: undefined, isFetching: false };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("../../../hooks/useTargetLanguage", () => ({
  useTargetLanguage: () => "ko",
}));

jest.mock("../../../store/slices/momentsSlice", () => ({
  useLikeCommentMutation: () => [mockLikeComment, {}],
  useReactToCommentMutation: () => [mockReactToComment, {}],
  useUnreactToCommentMutation: () => [mockUnreactToComment, {}],
  useTranslateCommentMutation: () => [mockTranslateComment, {}],
  useDeleteMomentCommentMutation: () => [mockDeleteComment, {}],
  useAddMomentCommentMutation: () => [mockAddComment, { isLoading: false }],
  useUploadCommentImageMutation: () => [mockUploadImage, { isLoading: false }],
  useGetCommentRepliesQuery: (_args: any, options: any) =>
    options && options.skip ? { data: undefined, isFetching: false } : mockRepliesResult,
}));

const unwrappable = (value: any) => ({ unwrap: () => Promise.resolve(value) });

const baseComment = (overrides: any = {}) => ({
  _id: "c-1",
  text: "Nice moment!",
  createdAt: new Date().toISOString(),
  user: { _id: "author-1", name: "Aria", imageUrls: [] },
  likeCount: 2,
  likedUsers: [],
  replyCount: 0,
  reactions: [],
  ...overrides,
});

const renderItem = (props: any = {}) => {
  const onRequireLogin = props.onRequireLogin || jest.fn();
  const utils = render(
    <CommentItem
      comment={props.comment || baseComment()}
      momentId="moment-1"
      myUserId={props.myUserId === undefined ? "me-1" : props.myUserId}
      isLoggedIn={props.isLoggedIn !== false}
      onRequireLogin={onRequireLogin}
      allowReplies={props.allowReplies}
    />
  );
  return { ...utils, onRequireLogin };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLikeComment.mockReturnValue(unwrappable({ data: { isLiked: true, likeCount: 3 } }));
  mockReactToComment.mockReturnValue(unwrappable({ data: { reactions: [], reactionCount: 1 } }));
  mockUnreactToComment.mockReturnValue(unwrappable({ data: { reactions: [], reactionCount: 0 } }));
  mockTranslateComment.mockReturnValue(
    unwrappable({ data: { language: "ko", translatedText: "좋은 순간이네요!" } })
  );
  mockDeleteComment.mockReturnValue(unwrappable({ success: true }));
  mockAddComment.mockReturnValue(unwrappable({ data: { _id: "c-2" } }));
  mockRepliesResult = { data: undefined, isFetching: false };
});

describe("CommentItem", () => {
  it("renders the author, the body and the like count", () => {
    renderItem();
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByTestId("translatable-text")).toHaveTextContent("Nice moment!");
    expect(screen.getByTestId("comment-like")).toHaveTextContent("2");
  });

  it("likes the comment and reflects the server's count", async () => {
    renderItem();
    fireEvent.click(screen.getByTestId("comment-like"));

    expect(mockLikeComment).toHaveBeenCalledWith("c-1");
    await waitFor(() =>
      expect(screen.getByTestId("comment-like")).toHaveTextContent("3")
    );
    expect(screen.getByTestId("comment-like")).toHaveAttribute("aria-pressed", "true");
  });

  it("asks a logged-out visitor to sign in instead of liking", () => {
    const { onRequireLogin } = renderItem({ isLoggedIn: false, myUserId: undefined });
    fireEvent.click(screen.getByTestId("comment-like"));
    expect(onRequireLogin).toHaveBeenCalled();
    expect(mockLikeComment).not.toHaveBeenCalled();
  });

  it("translates the body through translateComment", async () => {
    renderItem();
    fireEvent.click(screen.getByTestId("translatable-text"));
    await waitFor(() =>
      expect(mockTranslateComment).toHaveBeenCalledWith({
        commentId: "c-1",
        targetLanguage: "ko",
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId("translatable-translation")).toHaveTextContent(
        "좋은 순간이네요!"
      )
    );
  });

  it("renders the correction card with original, corrected and explanation", () => {
    renderItem({
      comment: baseComment({
        text: "✏️ Correction",
        correction: {
          originalText: "I go to school yesterday",
          correctedText: "I went to school yesterday",
          explanation: "Past tense of 'go' is 'went'.",
        },
      }),
    });

    expect(screen.getByTestId("comment-correction")).toBeInTheDocument();
    expect(screen.getByTestId("comment-correction-original")).toHaveTextContent(
      "I go to school yesterday"
    );
    expect(screen.getByTestId("comment-correction-corrected")).toHaveTextContent(
      "I went to school yesterday"
    );
    expect(
      screen.getByTestId("comment-correction-explanation")
    ).toHaveTextContent("Past tense of 'go' is 'went'.");
    expect(screen.getByText("Correction")).toBeInTheDocument();
  });

  it("renders an attached image when the comment has one", () => {
    renderItem({ comment: baseComment({ imageUrl: "https://cdn/x.jpg" }) });
    expect(screen.getByTestId("comment-image")).toHaveAttribute(
      "src",
      "https://cdn/x.jpg"
    );
  });

  it("toggles the inline reply composer from the reply button", () => {
    renderItem();
    expect(screen.queryByTestId("comment-composer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("comment-reply"));
    expect(screen.getByTestId("comment-composer")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("comment-reply"));
    expect(screen.queryByTestId("comment-composer")).not.toBeInTheDocument();
  });

  it("toggles the replies thread when the comment has replies", () => {
    mockRepliesResult = {
      data: {
        data: [
          {
            _id: "r-1",
            text: "Thanks!",
            createdAt: new Date().toISOString(),
            user: { _id: "author-2", name: "Bo", imageUrls: [] },
          },
        ],
        total: 1,
        page: 1,
        pages: 1,
      },
      isFetching: false,
    };

    renderItem({ comment: baseComment({ replyCount: 1 }) });

    const toggle = screen.getByTestId("comment-replies-toggle");
    expect(toggle).toHaveTextContent("View 1 replies");
    expect(screen.queryByTestId("replies-thread")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId("replies-thread")).toBeInTheDocument();
    expect(screen.getByText("Bo")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByTestId("replies-thread")).not.toBeInTheDocument();
  });

  it("offers delete only on my own comments", () => {
    renderItem();
    expect(screen.queryByTestId("comment-delete")).not.toBeInTheDocument();

    renderItem({
      comment: baseComment({ _id: "c-9", user: { _id: "me-1", name: "Me" } }),
    });
    fireEvent.click(screen.getByTestId("comment-delete"));
    expect(mockDeleteComment).toHaveBeenCalledWith({
      momentId: "moment-1",
      commentId: "c-9",
    });
  });

  it("reacts with an emoji from the compact picker", async () => {
    renderItem();
    fireEvent.click(screen.getByTestId("comment-react-toggle"));
    fireEvent.click(screen.getByTestId("moment-quick-pick-🔥"));

    await waitFor(() =>
      expect(mockReactToComment).toHaveBeenCalledWith({
        commentId: "c-1",
        emoji: "🔥",
      })
    );
  });

  it("hides reply and replies affordances one level deep", () => {
    renderItem({ comment: baseComment({ replyCount: 3 }), allowReplies: false });
    expect(screen.queryByTestId("comment-reply")).not.toBeInTheDocument();
    expect(screen.queryByTestId("comment-replies-toggle")).not.toBeInTheDocument();
  });
});
