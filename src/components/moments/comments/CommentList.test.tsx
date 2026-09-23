import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommentList from "./CommentList";

let mockCommentsResult: any = { data: { data: [] }, isLoading: false };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("../../../hooks/useTargetLanguage", () => ({
  useTargetLanguage: () => "en",
}));

jest.mock("../../ads/AdUnit", () => () => null);

const noop = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}];

jest.mock("../../../store/slices/momentsSlice", () => ({
  useGetMomentCommentsQuery: () => mockCommentsResult,
  useLikeCommentMutation: () => noop(),
  useReactToCommentMutation: () => noop(),
  useUnreactToCommentMutation: () => noop(),
  useTranslateCommentMutation: () => noop(),
  useDeleteMomentCommentMutation: () => noop(),
  useAddMomentCommentMutation: () => [jest.fn(), { isLoading: false }],
  useUploadCommentImageMutation: () => [jest.fn(), { isLoading: false }],
  useGetCommentRepliesQuery: () => ({ data: undefined, isFetching: false }),
}));

const renderList = (props: any = {}) =>
  render(
    <MemoryRouter>
      <CommentList
        momentId="moment-1"
        momentText="I go to school yesterday"
        myUserId={props.myUserId === undefined ? "me-1" : props.myUserId}
        isLoggedIn={props.isLoggedIn !== false}
        onRequireLogin={props.onRequireLogin || jest.fn()}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockCommentsResult = { data: { data: [] }, isLoading: false };
});

describe("CommentList", () => {
  it("shows the empty state when there are no comments", () => {
    renderList();
    expect(screen.getByTestId("comments-empty")).toHaveTextContent(
      "No comments yet"
    );
  });

  it("renders one item per comment", () => {
    mockCommentsResult = {
      data: {
        data: [
          {
            _id: "c-1",
            text: "First",
            createdAt: new Date().toISOString(),
            user: { _id: "u-1", name: "Ann", imageUrls: [] },
          },
          {
            _id: "c-2",
            text: "Second",
            createdAt: new Date().toISOString(),
            user: { _id: "u-2", name: "Ben", imageUrls: [] },
          },
        ],
      },
      isLoading: false,
    };

    renderList();
    expect(screen.getAllByTestId("comment-item")).toHaveLength(2);
    expect(screen.queryByTestId("comments-empty")).not.toBeInTheDocument();
  });

  it("offers a correction composer alongside the comment composer", () => {
    renderList();
    expect(screen.queryByTestId("comment-composer-corrected")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("comments-mode-correction"));
    expect(screen.getByTestId("comment-composer-original")).toHaveValue(
      "I go to school yesterday"
    );
  });

  it("shows a sign-in prompt instead of the composer when logged out", () => {
    renderList({ isLoggedIn: false, myUserId: undefined });
    expect(screen.queryByTestId("comment-composer")).not.toBeInTheDocument();
    expect(screen.getByTestId("comments-signin")).toBeInTheDocument();
  });
});
