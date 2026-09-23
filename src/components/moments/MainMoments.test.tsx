import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import MainMoments from "./MainMoments";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "" }),
}));

jest.mock("../stories/StoriesFeed", () => () => null);
jest.mock("../ads/AdUnit", () => () => null);

const pagination = (page = 1) => ({
  currentPage: page,
  totalPages: 1,
  totalMoments: 0,
  limit: 10,
  hasNextPage: false,
  hasPrevPage: false,
  nextPage: null,
  prevPage: null,
});

const emptyFeedResult = () => ({
  data: { moments: [], pagination: pagination() },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
});

// CRA's default jest config sets `resetMocks: true`, which wipes any
// `mockImplementation` before *every* test (including the first). So the
// implementations below are (re)installed in `beforeEach`, not at module
// scope, and the query results they read (`forYouResult`/`followingResult`)
// are plain `let`s each test can override before rendering.
const mockUseGetMomentsQuery = jest.fn();
const mockUseGetTrendingMomentsQuery = jest.fn();
const mockUseGetExploreMomentsQuery = jest.fn();
const mockUseGetPromptOfDayQuery = jest.fn();

jest.mock("../../store/slices/momentsSlice", () => ({
  useGetMomentsQuery: (...args: any[]) => mockUseGetMomentsQuery(...args),
  useGetTrendingMomentsQuery: (...args: any[]) =>
    mockUseGetTrendingMomentsQuery(...args),
  useGetExploreMomentsQuery: (...args: any[]) =>
    mockUseGetExploreMomentsQuery(...args),
  useGetPromptOfDayQuery: (...args: any[]) =>
    mockUseGetPromptOfDayQuery(...args),
}));

function makeStore(user?: any) {
  return configureStore({
    reducer: {
      auth: (state: any = { userInfo: user ? { user } : undefined }) => state,
    },
  });
}

function renderMainMoments(user?: any) {
  return render(
    <Provider store={makeStore(user)}>
      <MemoryRouter>
        <MainMoments />
      </MemoryRouter>
    </Provider>
  );
}

let forYouResult: any;
let followingResult: any;

beforeEach(() => {
  forYouResult = emptyFeedResult();
  followingResult = emptyFeedResult();

  mockUseGetMomentsQuery.mockImplementation((args: any) =>
    args && args.feed === "following" ? followingResult : forYouResult
  );
  mockUseGetTrendingMomentsQuery.mockImplementation(() => emptyFeedResult());
  mockUseGetExploreMomentsQuery.mockImplementation(() => emptyFeedResult());
  mockUseGetPromptOfDayQuery.mockImplementation(() => ({
    data: undefined,
    error: undefined,
  }));
});

const loggedInUser = { _id: "u1", name: "Ada", imageUrls: [] };

it("does not show a Following tab when logged out", () => {
  renderMainMoments();
  expect(
    screen.queryByRole("tab", { name: /Following/i })
  ).not.toBeInTheDocument();
});

it("shows a Following tab when logged in", () => {
  renderMainMoments(loggedInUser);
  expect(screen.getByRole("tab", { name: /Following/i })).toBeInTheDocument();
});

it("queries the following feed (page 1, skip:false) once the tab is selected", () => {
  renderMainMoments(loggedInUser);
  fireEvent.click(screen.getByRole("tab", { name: /Following/i }));

  expect(mockUseGetMomentsQuery).toHaveBeenCalledWith(
    { page: 1, limit: expect.any(Number), feed: "following" },
    { skip: false }
  );
});

it("shows the empty state with a link to /communities when the following feed has no moments", () => {
  renderMainMoments(loggedInUser);
  fireEvent.click(screen.getByRole("tab", { name: /Following/i }));

  expect(
    screen.getByText("Follow people to see their moments here")
  ).toBeInTheDocument();
  const link = screen.getByRole("link", { name: "Find people" });
  expect(link).toHaveAttribute("href", "/communities");
});
