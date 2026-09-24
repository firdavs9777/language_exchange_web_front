import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import ProfilePage from "./ProfilePage";

// react-helmet-async hands back a null server context under jsdom unless
// canUseDOM is forced false -- the same trick NotFound.test.tsx uses to read
// the rendered tags back out of renderToString.
HelmetProvider.canUseDOM = false;

const mockGetUserProfile = jest.fn();
const mockGetPublicProfile = jest.fn();
const mockGetMyMoments = jest.fn();
const mockFollow = jest.fn();
const mockUnfollow = jest.fn();
const mockBlock = jest.fn();
const mockReport = jest.fn();
const mockCreateChatRoom = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../store/slices/usersSlice", () => ({
  useGetUserProfileQuery: (arg: any, opts: any) => mockGetUserProfile(arg, opts),
  useFollowUserMutation: () => [mockFollow, { isLoading: false }],
  useUnFollowUserMutation: () => [mockUnfollow, { isLoading: false }],
  useBlockUserMutation: () => [mockBlock, { isLoading: false }],
  useReportUserMutation: () => [mockReport, { isLoading: false }],
}));

jest.mock("../../store/slices/communitySlice", () => ({
  useGetPublicUserProfileQuery: (arg: any, opts: any) => mockGetPublicProfile(arg, opts),
}));

jest.mock("../../store/slices/momentsSlice", () => ({
  useGetMyMomentsQuery: (arg: any, opts: any) => mockGetMyMoments(arg, opts),
}));

jest.mock("../../store/slices/chatSlice", () => ({
  useCreateChatRoomMutation: () => [mockCreateChatRoom, { isLoading: false }],
}));

const ownRefetch = jest.fn();
const otherRefetch = jest.fn();
const momentsRefetch = jest.fn();

const idle = { data: undefined, isLoading: false, isFetching: false, error: undefined };
const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });

function page(path: string, viewerId: string | null) {
  const store = configureStore({
    reducer: {
      auth: (state: any = { userInfo: viewerId ? { user: { _id: viewerId } } : null }) => state,
    },
  });
  return (
    <Provider store={store}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/login" element={<div data-testid="login-screen" />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>
  );
}

function renderPage(path: string = "/profile", viewerId: string | null = "me") {
  return render(page(path, viewerId));
}

beforeEach(() => {
  mockGetUserProfile.mockReturnValue({ ...idle, refetch: ownRefetch });
  mockGetPublicProfile.mockReturnValue({ ...idle, refetch: otherRefetch });
  mockGetMyMoments.mockReturnValue({ ...idle, refetch: momentsRefetch });
  mockBlock.mockReturnValue(resolved());
  mockFollow.mockReturnValue(resolved());
  mockUnfollow.mockReturnValue(resolved());
  mockReport.mockReturnValue(resolved());
  mockCreateChatRoom.mockReturnValue(resolved());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("own profile", () => {
  it("reads the signed-in user from the store when the route has no id", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me", username: "me", native_language: "Korean" } },
    });

    renderPage("/profile", "me");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Me");
    // Own profile: edit + settings, never the social actions.
    expect(screen.getByTestId("action-edit-profile")).toBeInTheDocument();
    expect(screen.queryByTestId("action-follow")).not.toBeInTheDocument();
    // The other-user endpoint is never asked.
    expect(mockGetPublicProfile.mock.calls[0][1].skip).toBe(true);
  });

  it("feeds the header badge row from the user document", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: {
        data: {
          _id: "me",
          name: "Me",
          userMode: "vip",
          isEmailVerified: true,
          createdAt: "2024-03-02T00:00:00.000Z",
        },
      },
    });

    renderPage("/profile", "me");

    expect(screen.getByTestId("badge-vip")).toBeInTheDocument();
    expect(screen.getByTestId("badge-verified")).toBeInTheDocument();
    expect(screen.getByTestId("badge-joined")).toBeInTheDocument();
  });
});

describe("another person's profile", () => {
  it("renders from the route param with the social actions", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada", followers: ["me"] } },
    });

    renderPage("/profile/u2", "me");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ada");
    expect(screen.getByTestId("action-message")).toBeInTheDocument();
    // isFollowing comes from the target's followers list.
    expect(screen.getByTestId("action-follow")).toHaveAttribute("aria-pressed", "true");
    expect(mockGetUserProfile.mock.calls[0][1].skip).toBe(true);
  });

  it("asks for the profile's moments with the same argument the hook uses", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada" } },
    });

    renderPage("/profile/u2", "me");

    // Every call -- the hook's and the section's -- must carry the identical
    // argument or RTK Query issues two requests instead of one.
    mockGetMyMoments.mock.calls.forEach((call: any[]) => {
      expect(call[0]).toEqual({ userId: "u2" });
    });
  });
});

describe("states", () => {
  it("shows a skeleton in the shape of the page while it loads", () => {
    mockGetUserProfile.mockReturnValue({ ...idle, refetch: ownRefetch, isLoading: true });

    renderPage("/profile", "me");

    expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-body")).not.toBeInTheDocument();
    expect(screen.queryByTestId("profile-error")).not.toBeInTheDocument();
  });

  it("offers a retry that refetches the profile", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      error: { status: 500 },
    });

    renderPage("/profile", "me");

    expect(screen.getByTestId("profile-error")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("profile-retry"));
    expect(ownRefetch).toHaveBeenCalled();
    expect(momentsRefetch).toHaveBeenCalled();
  });

  it("treats a 404 as not found and points back at the community", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      error: { status: 404 },
    });

    renderPage("/profile/u2", "me");

    expect(screen.queryByTestId("profile-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-not-found")).toBeInTheDocument();
    expect(screen.getByTestId("profile-back-to-community")).toHaveAttribute("href", "/communities");
  });

  it("sends a signed-out visitor to the login page instead of a not-found card", () => {
    renderPage("/profile", null);

    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-not-found")).not.toBeInTheDocument();
  });

  it("still shows another person's profile to a signed-out visitor", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada" } },
    });

    renderPage("/profile/u2", null);

    expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-body")).toBeInTheDocument();
  });

  it("is not found when the request succeeded with no user", () => {
    mockGetPublicProfile.mockReturnValue({ ...idle, refetch: otherRefetch, data: { data: null } });

    renderPage("/profile/u2", "me");

    expect(screen.getByTestId("profile-not-found")).toBeInTheDocument();
  });
});

describe("moderation", () => {
  it("leaves the blocked person's profile for the community", async () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada" } },
    });

    renderPage("/profile/u2", "me");

    fireEvent.click(screen.getByTestId("action-more"));
    fireEvent.click(screen.getByTestId("action-block"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(mockBlock).toHaveBeenCalledWith("u2"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/communities"));
  });
});

describe("photos", () => {
  it("shows the photo set, and Add photos on an own profile", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me", imageUrls: ["a.jpg", "b.jpg"] } },
    });

    renderPage("/profile", "me");

    expect(screen.getByTestId("profile-photos")).toBeInTheDocument();
    expect(screen.getAllByTestId("photo-tile")).toHaveLength(2);
    expect(screen.getByTestId("photos-add")).toHaveAttribute("href", "/profile/edit");
  });

  it("shows another person's photos without the Add link", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada", imageUrls: ["a.jpg"] } },
    });

    renderPage("/profile/u2", "me");

    expect(screen.getAllByTestId("photo-tile")).toHaveLength(1);
    expect(screen.queryByTestId("photos-add")).not.toBeInTheDocument();
  });

  it("renders no photos card at all when the account has none", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me", imageUrls: [] } },
    });

    renderPage("/profile", "me");

    expect(screen.queryByTestId("profile-photos")).not.toBeInTheDocument();
  });
});

describe("moments", () => {
  it("caps the grid and leaves the rest behind See all", () => {
    const many = Array.from({ length: 12 }).map((unused, i) => ({
      _id: `m${i}`,
      description: `moment ${i}`,
    }));
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me" } },
    });
    mockGetMyMoments.mockReturnValue({
      ...idle,
      refetch: momentsRefetch,
      data: { data: many, totalMoments: 12 },
    });

    renderPage("/profile", "me");

    expect(screen.getAllByTestId("moment-tile")).toHaveLength(9);
    expect(screen.getByTestId("moments-see-all")).toBeInTheDocument();
  });
});

it("titles the page after the person and keeps it out of the index", () => {
  mockGetPublicProfile.mockReturnValue({
    ...idle,
    refetch: otherRefetch,
    data: { data: { _id: "u2", name: "Ada" } },
  });

  // renderToString walks react-router's Links, and useNavigate's layout effect
  // warns on the server. The warning is react-router's, not the page's, and it
  // would otherwise be the only noise this suite prints.
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  const context: any = {};
  renderToString(
    <HelmetProvider context={context}>
      <Provider
        store={configureStore({
          reducer: { auth: (state: any = { userInfo: { user: { _id: "me" } } }) => state },
        })}
      >
        <MemoryRouter initialEntries={["/profile/u2"]}>
          <Routes>
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/login" element={<div data-testid="login-screen" />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </HelmetProvider>
  );

  consoleError.mockRestore();

  expect(context.helmet.title.toString()).toContain("Ada · BananaTalk");
  expect(context.helmet.meta.toString()).toContain("noindex");
});
