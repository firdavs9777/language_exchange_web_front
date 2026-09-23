import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SingleMoment from "./SingleMoment";

const mockTranslateMoment = jest.fn();
const mockToastError = jest.fn();
let mockUserId: string | undefined = "me-1";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ko" } }),
}));

jest.mock("react-redux", () => ({
  useSelector: (selector: any) =>
    selector({ auth: { userInfo: mockUserId ? { user: { _id: mockUserId } } : undefined } }),
}));

jest.mock("react-toastify", () => ({
  toast: { error: (...args: any[]) => mockToastError(...args), success: jest.fn(), info: jest.fn() },
  Bounce: {},
}));

const noopMutation = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}];

jest.mock("../../store/slices/momentsSlice", () => ({
  useLikeMomentMutation: () => noopMutation(),
  useDislikeMomentMutation: () => noopMutation(),
  useReactToMomentMutation: () => noopMutation(),
  useUnreactToMomentMutation: () => noopMutation(),
  useShareMomentMutation: () => noopMutation(),
  useSaveMomentMutation: () => noopMutation(),
  useUnsaveMomentMutation: () => noopMutation(),
  useTranslateMomentMutation: () => [mockTranslateMoment, {}],
}));

const DESCRIPTION = "오늘 날씨가 정말 좋아요";

const renderMoment = () =>
  render(
    <MemoryRouter>
      <SingleMoment
        _id="moment-1"
        title="Title"
        description={DESCRIPTION}
        likeCount={0}
        likedUsers={[]}
        commentCount={0}
        createdAt={new Date().toISOString()}
        user={{ _id: "author-1", name: "Author" }}
      />
    </MemoryRouter>
  );

describe("SingleMoment translate on tap", () => {
  beforeEach(() => {
    mockTranslateMoment.mockReset();
    mockToastError.mockReset();
    mockUserId = "me-1";
  });

  it("translates the moment body with the moment id and the target language", async () => {
    mockTranslateMoment.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          success: true,
          data: { language: "ko", translatedText: "The weather is lovely today" },
          cached: false,
        }),
    });

    renderMoment();
    fireEvent.click(screen.getByTestId("translatable-text"));

    await waitFor(() =>
      expect(mockTranslateMoment).toHaveBeenCalledWith({
        momentId: "moment-1",
        targetLanguage: "ko",
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId("translatable-translation")).toHaveTextContent(
        "The weather is lovely today"
      )
    );
  });

  it("prompts a logged-out visitor to sign in instead of translating", () => {
    mockUserId = undefined;
    renderMoment();

    fireEvent.click(screen.getByTestId("translatable-text"));

    expect(mockTranslateMoment).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "moments_section.moment_login_error",
      expect.anything()
    );
  });
});
