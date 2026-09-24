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

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("./hooks/useSocket", () => ({
  useSocket: () => mockUseSocket(),
}));

const mutation = () => [jest.fn(), { isLoading: false }];

jest.mock("../../store/slices/chatSlice", () => ({
  useGetConversationQuery: (arg: any, opts: any) => mockGetConversation(arg, opts),
  // ForwardDialog, mounted (closed) by ChatContent.
  useGetConversationsQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateMessageMutation: () => mutation(),
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

/** The composer input, found the way a person finds it. */
function messageBox(): HTMLInputElement {
  return screen.getByPlaceholderText("Message...") as HTMLInputElement;
}

beforeEach(() => {
  mockUseSocket.mockReturnValue({ socket: null, isConnected: false, emit: jest.fn() });
  mockGetConversation.mockReturnValue({ data: undefined, error: undefined, isLoading: false });
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
