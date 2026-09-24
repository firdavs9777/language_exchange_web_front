import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConversationStarters, { buildStarters } from "./ConversationStarters";

const mockNavigate = jest.fn();
const mockCreateChatRoom = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../../store/slices/chatSlice", () => ({
  useCreateChatRoomMutation: () => [mockCreateChatRoom, { isLoading: false }],
}));

const t = () => "";

const viewer = { native_language: "Korean", language_to_learn: "English", topics: ["music"] };
const target = { native_language: "English", language_to_learn: "Korean", topics: ["music", "food"] };

beforeEach(() => {
  mockCreateChatRoom.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
});

afterEach(() => {
  jest.clearAllMocks();
});

function renderCard(props: any = {}) {
  return render(
    <MemoryRouter>
      <ConversationStarters userId="u2" viewer={viewer} user={target} name="Ada" {...props} />
    </MemoryRouter>
  );
}

describe("buildStarters", () => {
  it("always offers exactly three", () => {
    expect(buildStarters(viewer, target, "Ada", t)).toHaveLength(3);
    expect(buildStarters({ native_language: "Thai" }, {}, "", t)).toHaveLength(3);
  });

  it("is deterministic -- the same two profiles always produce the same three", () => {
    const first = buildStarters(viewer, target, "Ada", t);
    const second = buildStarters(viewer, target, "Ada", t);
    expect(second).toEqual(first);
  });

  it("leads with the match, then the shared topic, then what they are learning", () => {
    expect(buildStarters(viewer, target, "Ada", t).map((s) => s.key)).toEqual([
      "perfect",
      "topic",
      "targetLearning",
    ]);
  });

  it("asks for tips when the viewer is learning what they speak", () => {
    const starters = buildStarters(
      { native_language: "Korean", language_to_learn: "English" },
      { native_language: "English", language_to_learn: "Spanish" },
      "Ada",
      t
    );
    expect(starters[0].key).toBe("language");
    expect(starters[0].text).toContain("I'm learning English");
  });

  it("falls back to the generic openers when the profiles have nothing in common", () => {
    expect(
      buildStarters(
        { native_language: "Korean", language_to_learn: "English" },
        {},
        "Ada",
        t
      ).map((starter) => starter.key)
    ).toEqual(["generic", "practice", "hello"]);
  });

  it("names the person in every line", () => {
    buildStarters(viewer, target, "Ada", t).forEach((starter) => {
      expect(starter.text).toContain("Ada");
    });
  });
});

describe("the card", () => {
  it("renders three starters", () => {
    renderCard();
    expect(screen.getAllByTestId("conversation-starter")).toHaveLength(3);
  });

  it("renders nothing to a signed-out visitor", () => {
    const { container } = render(
      <MemoryRouter>
        <ConversationStarters userId="u2" user={target} name="Ada" />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the chat with the starter as a draft", async () => {
    renderCard();
    const text = screen.getAllByTestId("conversation-starter")[0].textContent || "";
    fireEvent.click(screen.getAllByTestId("conversation-starter-send")[0]);

    await waitFor(() => expect(mockCreateChatRoom).toHaveBeenCalledWith("u2"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const target_ = String(mockNavigate.mock.calls[0][0]);
    expect(target_.startsWith("/chat/u2?draft=")).toBe(true);
    const draft = decodeURIComponent(target_.split("?draft=")[1]);
    expect(text).toContain(draft);
  });

  it("still opens the chat when the room pre-create fails", async () => {
    mockCreateChatRoom.mockReturnValue({ unwrap: () => Promise.reject(new Error("nope")) });
    renderCard();
    fireEvent.click(screen.getAllByTestId("conversation-starter-send")[0]);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});
