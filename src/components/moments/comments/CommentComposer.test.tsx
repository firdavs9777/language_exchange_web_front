import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CommentComposer from "./CommentComposer";

const mockAddComment = jest.fn();
const mockUploadImage = jest.fn();
let mockAddState: any = { isLoading: false };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("../../../store/slices/momentsSlice", () => ({
  useAddMomentCommentMutation: () => [mockAddComment, mockAddState],
  useUploadCommentImageMutation: () => [mockUploadImage, { isLoading: false }],
}));

const unwrappable = (value: any) => ({ unwrap: () => Promise.resolve(value) });

const renderComposer = (props: any = {}) => {
  const onRequireLogin = props.onRequireLogin || jest.fn();
  const onDone = props.onDone || jest.fn();
  render(
    <CommentComposer
      momentId="moment-1"
      mode={props.mode}
      parentComment={props.parentComment}
      momentText={props.momentText}
      isLoggedIn={props.isLoggedIn !== false}
      onRequireLogin={onRequireLogin}
      onDone={onDone}
      inputId={props.inputId}
    />
  );
  return { onRequireLogin, onDone };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAddState = { isLoading: false };
  mockAddComment.mockReturnValue(unwrappable({ data: { _id: "c-new" } }));
  mockUploadImage.mockReturnValue(unwrappable({ data: { imageUrl: "https://cdn/x.jpg" } }));
});

describe("CommentComposer", () => {
  it("submits a plain comment with { momentId, text }", async () => {
    const { onDone } = renderComposer();
    const box = screen.getByTestId("comment-composer-text");

    fireEvent.change(box, { target: { value: "Great shot" } });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    await waitFor(() =>
      expect(mockAddComment).toHaveBeenCalledWith({
        momentId: "moment-1",
        text: "Great shot",
      })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(screen.getByTestId("comment-composer-text")).toHaveValue("");
  });

  it("submits a reply with the parent comment id", async () => {
    renderComposer({ mode: "reply", parentComment: "c-1" });

    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Agreed" },
    });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    await waitFor(() =>
      expect(mockAddComment).toHaveBeenCalledWith({
        momentId: "moment-1",
        text: "Agreed",
        parentComment: "c-1",
      })
    );
  });

  it("prefills the original text in correction mode and submits a correction", async () => {
    renderComposer({ mode: "correction", momentText: "I go to school yesterday" });

    expect(screen.getByTestId("comment-composer-original")).toHaveValue(
      "I go to school yesterday"
    );

    fireEvent.change(screen.getByTestId("comment-composer-corrected"), {
      target: { value: "I went to school yesterday" },
    });
    fireEvent.change(screen.getByTestId("comment-composer-explanation"), {
      target: { value: "Past tense." },
    });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    await waitFor(() =>
      expect(mockAddComment).toHaveBeenCalledWith({
        momentId: "moment-1",
        text: "",
        correction: {
          originalText: "I go to school yesterday",
          correctedText: "I went to school yesterday",
          explanation: "Past tense.",
        },
      })
    );
  });

  it("uploads an attached image onto the comment it just created", async () => {
    renderComposer();
    const file = new File(["x"], "photo.png", { type: "image/png" });

    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Look" },
    });
    fireEvent.change(screen.getByTestId("comment-composer-image"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    await waitFor(() =>
      expect(mockUploadImage).toHaveBeenCalledWith({ commentId: "c-new", file })
    );
  });

  it("disables submit while empty and while the request is in flight", () => {
    const { unmount } = render(
      <CommentComposer
        momentId="moment-1"
        isLoggedIn
        onRequireLogin={jest.fn()}
      />
    );
    expect(screen.getByTestId("comment-composer-submit")).toBeDisabled();

    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Hi" },
    });
    expect(screen.getByTestId("comment-composer-submit")).not.toBeDisabled();
    unmount();

    mockAddState = { isLoading: true };
    render(
      <CommentComposer
        momentId="moment-1"
        isLoggedIn
        onRequireLogin={jest.fn()}
      />
    );
    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Hi" },
    });
    expect(screen.getByTestId("comment-composer-submit")).toBeDisabled();
  });

  it("keeps submit disabled in correction mode until there is a corrected text", () => {
    renderComposer({ mode: "correction", momentText: "original" });
    expect(screen.getByTestId("comment-composer-submit")).toBeDisabled();

    fireEvent.change(screen.getByTestId("comment-composer-corrected"), {
      target: { value: "fixed" },
    });
    expect(screen.getByTestId("comment-composer-submit")).not.toBeDisabled();
  });

  it("asks a logged-out visitor to sign in instead of posting", () => {
    const { onRequireLogin } = renderComposer({ isLoggedIn: false });

    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    expect(onRequireLogin).toHaveBeenCalled();
    expect(mockAddComment).not.toHaveBeenCalled();
  });

  it("shows the server's error inline and keeps the text", async () => {
    mockAddComment.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: "Daily comment limit reached" } }),
    });
    renderComposer();

    fireEvent.change(screen.getByTestId("comment-composer-text"), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByTestId("comment-composer-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("comment-composer-error")).toHaveTextContent(
        "Daily comment limit reached"
      )
    );
    expect(screen.getByTestId("comment-composer-text")).toHaveValue("Hi");
  });
});
