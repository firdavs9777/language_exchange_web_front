import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import RepliesThread from "./RepliesThread";

const mockGetReplies = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("../../../hooks/useTargetLanguage", () => ({
  useTargetLanguage: () => "en",
}));

const noop = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}];

jest.mock("../../../store/slices/momentsSlice", () => ({
  useLikeCommentMutation: () => noop(),
  useReactToCommentMutation: () => noop(),
  useUnreactToCommentMutation: () => noop(),
  useTranslateCommentMutation: () => noop(),
  useDeleteMomentCommentMutation: () => noop(),
  useAddMomentCommentMutation: () => [jest.fn(), { isLoading: false }],
  useUploadCommentImageMutation: () => [jest.fn(), { isLoading: false }],
  useGetCommentRepliesQuery: (args: any) => mockGetReplies(args),
}));

const reply = (id: string, name: string) => ({
  _id: id,
  text: `reply ${id}`,
  createdAt: new Date().toISOString(),
  user: { _id: `u-${id}`, name, imageUrls: [] },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RepliesThread", () => {
  it("loads the next page and keeps the replies already shown", () => {
    mockGetReplies.mockImplementation(({ page }: any) =>
      page === 1
        ? { data: { data: [reply("r-1", "Ann")], total: 2, page: 1, pages: 2 }, isFetching: false }
        : { data: { data: [reply("r-2", "Ben")], total: 2, page: 2, pages: 2 }, isFetching: false }
    );

    render(
      <RepliesThread
        commentId="c-1"
        momentId="moment-1"
        myUserId="me-1"
        isLoggedIn
        onRequireLogin={jest.fn()}
      />
    );

    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.queryByText("Ben")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("replies-load-more"));

    expect(mockGetReplies).toHaveBeenCalledWith(
      expect.objectContaining({ commentId: "c-1", page: 2 })
    );
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.queryByTestId("replies-load-more")).not.toBeInTheDocument();
  });

  it("hides load more on the last page", () => {
    mockGetReplies.mockReturnValue({
      data: { data: [reply("r-1", "Ann")], total: 1, page: 1, pages: 1 },
      isFetching: false,
    });

    render(
      <RepliesThread
        commentId="c-1"
        momentId="moment-1"
        myUserId="me-1"
        isLoggedIn
        onRequireLogin={jest.fn()}
      />
    );

    expect(screen.queryByTestId("replies-load-more")).not.toBeInTheDocument();
  });

  it("does not offer a nested reply button on a reply", () => {
    mockGetReplies.mockReturnValue({
      data: { data: [reply("r-1", "Ann")], total: 1, page: 1, pages: 1 },
      isFetching: false,
    });

    render(
      <RepliesThread
        commentId="c-1"
        momentId="moment-1"
        myUserId="me-1"
        isLoggedIn
        onRequireLogin={jest.fn()}
      />
    );

    expect(screen.queryByTestId("comment-reply")).not.toBeInTheDocument();
  });
});
