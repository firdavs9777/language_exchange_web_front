import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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
const mockGetCommunityMembers = jest.fn();
const mockSendWave = jest.fn();
const mockGetUserHighlights = jest.fn();
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
  useGetCommunityMembersQuery: (arg: any, opts: any) => mockGetCommunityMembers(arg, opts),
  useSendWaveMutation: () => [mockSendWave, { isLoading: false }],
}));

jest.mock("../../store/slices/momentsSlice", () => ({
  useGetMyMomentsQuery: (arg: any, opts: any) => mockGetMyMoments(arg, opts),
}));

jest.mock("../../store/slices/chatSlice", () => ({
  useCreateChatRoomMutation: () => [mockCreateChatRoom, { isLoading: false }],
}));

// The highlights rail is a real child here (it is what decides whether the
// section appears at all), so only its one query is stubbed.
jest.mock("../../store/slices/storiesSlice", () => ({
  useGetUserHighlightsQuery: (arg: any, opts: any) => mockGetUserHighlights(arg, opts),
}));

const ownRefetch = jest.fn();
const otherRefetch = jest.fn();
const momentsRefetch = jest.fn();

const idle = { data: undefined, isLoading: false, isFetching: false, error: undefined };
const resolved = () => ({ unwrap: () => Promise.resolve({ success: true }) });

/** Reads the live URL back out of the router, for the tab assertions. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

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
          <LocationProbe />
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
  mockGetCommunityMembers.mockReturnValue({ ...idle });
  mockGetUserHighlights.mockReturnValue({ ...idle });
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
  // The photo card is declared in both panels -- About on a phone, the right
  // column on a desktop -- with exactly one displayed at any width, so every
  // assertion here names which panel it means.
  const about = () => within(screen.getByTestId("profile-about-panel"));
  const moments = () => within(screen.getByTestId("profile-moments-panel"));

  it("shows the photo set, and Add photos on an own profile", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me", imageUrls: ["a.jpg", "b.jpg"] } },
    });

    renderPage("/profile", "me");

    expect(about().getByTestId("profile-photos")).toBeInTheDocument();
    expect(about().getAllByTestId("photo-tile")).toHaveLength(2);
    expect(about().getByTestId("photos-add")).toHaveAttribute("href", "/profile/edit");
  });

  it("puts the desktop copy in the right-hand column", () => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me", imageUrls: ["a.jpg"] } },
    });

    renderPage("/profile", "me");

    // Phone: the About copy shows, the column copy is held back to lg.
    const phone = about().getByTestId("profile-photos-phone");
    const desktop = moments().getByTestId("profile-photos-desktop");
    expect(phone.className).toContain("lg:hidden");
    expect(desktop.className).toContain("hidden lg:block");
    expect(within(phone).getByTestId("profile-photos")).toBeInTheDocument();
    expect(within(desktop).getByTestId("profile-photos")).toBeInTheDocument();
  });

  it("shows another person's photos without the Add link", () => {
    mockGetPublicProfile.mockReturnValue({
      ...idle,
      refetch: otherRefetch,
      data: { data: { _id: "u2", name: "Ada", imageUrls: ["a.jpg"] } },
    });

    renderPage("/profile/u2", "me");

    expect(about().getAllByTestId("photo-tile")).toHaveLength(1);
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

// The app's member page carries four blocks a profile page of your own has no
// use for. Every one of them is keyed off `isOwn`, so this is the guard that
// they never appear on /profile.
describe("the match-aware blocks", () => {
  const viewer = {
    _id: "me",
    name: "Me",
    native_language: "Korean",
    language_to_learn: "English",
    topics: ["music", "travel"],
  };
  const other = {
    _id: "u2",
    name: "Ada",
    native_language: "English",
    language_to_learn: "Korean",
    topics: ["music"],
    responseRate: 91,
  };

  beforeEach(() => {
    mockGetUserProfile.mockReturnValue({ ...idle, refetch: ownRefetch, data: { data: viewer } });
    mockGetPublicProfile.mockReturnValue({ ...idle, refetch: otherRefetch, data: { data: other } });
    mockGetCommunityMembers.mockReturnValue({
      ...idle,
      data: {
        data: [
          { _id: "u3", name: "Grace", native_language: "English", language_to_learn: "Korean", imageUrls: [] },
        ],
      },
    });
  });

  it("renders the match, engagement, interests, starters and suggestions for someone else", () => {
    renderPage("/profile/u2", "me");

    expect(screen.getByTestId("language-match-card")).toHaveAttribute("data-match", "perfect");
    expect(screen.getByTestId("engagement-stats")).toBeInTheDocument();
    expect(screen.getByTestId("mutual-interests")).toBeInTheDocument();
    expect(screen.getByTestId("conversation-starters")).toBeInTheDocument();
    expect(screen.getByTestId("suggested-members")).toBeInTheDocument();
  });

  it("renders none of them on your own profile", () => {
    renderPage("/profile", "me");

    expect(screen.queryByTestId("language-match-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("engagement-stats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mutual-interests")).not.toBeInTheDocument();
    expect(screen.queryByTestId("conversation-starters")).not.toBeInTheDocument();
    expect(screen.queryByTestId("suggested-members")).not.toBeInTheDocument();
  });

  it("drops the signed-in-only blocks for a signed-out visitor", () => {
    mockGetUserProfile.mockReturnValue({ ...idle, refetch: ownRefetch });

    renderPage("/profile/u2", null);

    expect(screen.getByTestId("profile-body")).toBeInTheDocument();
    expect(screen.queryByTestId("language-match-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("conversation-starters")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mutual-interests")).not.toBeInTheDocument();
    // The engagement strip is public data, so it stays.
    expect(screen.getByTestId("engagement-stats")).toBeInTheDocument();
  });

  it("keeps the suggestions off the profile itself and off the viewer", () => {
    renderPage("/profile/u2", "me");

    expect(mockGetCommunityMembers.mock.calls[0][0]).toEqual({
      page: 1,
      limit: 12,
      language: "English",
    });
    expect(screen.getAllByTestId("suggested-member")).toHaveLength(1);
  });
});

describe("the phone tab switcher", () => {
  beforeEach(() => {
    mockGetUserProfile.mockReturnValue({
      ...idle,
      refetch: ownRefetch,
      data: { data: { _id: "me", name: "Me" } },
    });
  });

  it("opens on Moments and hides the About panel below 1024px", () => {
    renderPage("/profile", "me");

    expect(screen.getByTestId("profile-tab-moments")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("profile-about-panel").className).toContain("hidden");
    expect(screen.getByTestId("profile-moments-panel").className).not.toContain("hidden");
  });

  it("writes the chosen tab into the URL", () => {
    renderPage("/profile", "me");

    fireEvent.click(screen.getByTestId("profile-tab-about"));

    expect(screen.getByTestId("location-search")).toHaveTextContent("tab=about");
    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("profile-moments-panel").className).toContain("hidden");
    expect(screen.getByTestId("profile-about-panel").className).not.toContain("hidden");
  });

  it("reads the tab back off the URL", () => {
    renderPage("/profile?tab=about", "me");

    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("profile-about-panel").className).not.toContain("hidden");
  });

  it("keeps both panels in the DOM so switching costs no refetch", () => {
    renderPage("/profile?tab=about", "me");

    expect(screen.getByTestId("profile-moments-panel")).toBeInTheDocument();
    expect(screen.getByTestId("profile-about-panel")).toBeInTheDocument();
  });

  // An incomplete tablist reads worse than plain buttons: the reader
  // announces "tab 1 of 2" and then cannot find what it controls.
  it("wires each tab to the panel it controls", () => {
    renderPage("/profile", "me");

    const momentsTab = screen.getByTestId("profile-tab-moments");
    const aboutTab = screen.getByTestId("profile-tab-about");

    expect(momentsTab).toHaveAttribute("aria-controls", "profile-panel-moments");
    expect(aboutTab).toHaveAttribute("aria-controls", "profile-panel-about");
    expect(screen.getByTestId("profile-moments-panel")).toHaveAttribute("role", "tabpanel");
    expect(screen.getByTestId("profile-moments-panel")).toHaveAttribute(
      "aria-labelledby",
      momentsTab.id
    );
    expect(screen.getByTestId("profile-about-panel")).toHaveAttribute(
      "aria-labelledby",
      aboutTab.id
    );
  });

  it("gives the tablist one tab stop", () => {
    renderPage("/profile", "me");

    expect(screen.getByTestId("profile-tab-moments")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("tabindex", "-1");
  });

  it("moves between tabs with the arrow keys, and focus follows", () => {
    renderPage("/profile", "me");

    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "ArrowRight" });

    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("location-search")).toHaveTextContent("tab=about");
    expect(document.activeElement).toBe(screen.getByTestId("profile-tab-about"));

    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "ArrowLeft" });

    expect(screen.getByTestId("profile-tab-moments")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(screen.getByTestId("profile-tab-moments"));
  });

  it("wraps at the ends and answers Home and End", () => {
    renderPage("/profile", "me");

    // Moments is first: ArrowLeft wraps round to About.
    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "ArrowLeft" });
    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "Home" });
    expect(screen.getByTestId("profile-tab-moments")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "End" });
    expect(screen.getByTestId("profile-tab-about")).toHaveAttribute("aria-selected", "true");
  });

  it("leaves other keys to the browser", () => {
    renderPage("/profile", "me");

    fireEvent.keyDown(screen.getByTestId("profile-tabs"), { key: "a" });

    expect(screen.getByTestId("profile-tab-moments")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("location-search")).not.toHaveTextContent("tab=");
  });
});

describe("the story highlights rail", () => {
  const viewer = { _id: "me", name: "Me" };
  const other = { _id: "u2", name: "Ada" };

  const HIGHLIGHTS = {
    success: true,
    data: [
      {
        _id: "h-1",
        title: "Seoul",
        coverImage: "https://cdn/cover-1.jpg",
        storyCount: 1,
        stories: [
          { story: { _id: "s-1", mediaType: "image", mediaUrls: ["https://cdn/s1.jpg"] } },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockGetUserProfile.mockReturnValue({ ...idle, refetch: ownRefetch, data: { data: viewer } });
    mockGetPublicProfile.mockReturnValue({ ...idle, refetch: otherRefetch, data: { data: other } });
  });

  it("shows another person's highlights above their moments", () => {
    mockGetUserHighlights.mockReturnValue({ ...idle, data: HIGHLIGHTS });

    renderPage("/profile/u2", "me");

    const rail = screen.getByTestId("highlights-rail");
    expect(rail).toBeInTheDocument();
    expect(within(rail).getByTestId("highlight-rail-item")).toBeInTheDocument();
    expect(mockGetUserHighlights).toHaveBeenCalledWith("u2", { skip: false });

    // Above the moments, not below them.
    const moments = screen.getByTestId("profile-moments");
    expect(rail.compareDocumentPosition(moments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no rail when the person has no highlights", () => {
    mockGetUserHighlights.mockReturnValue({ ...idle, data: { success: true, data: [] } });
    renderPage("/profile/u2", "me");
    expect(screen.queryByTestId("highlights-rail")).not.toBeInTheDocument();
  });

  it("stays off your own profile, which manages highlights on /highlights", () => {
    mockGetUserHighlights.mockReturnValue({ ...idle, data: HIGHLIGHTS });
    renderPage("/profile", "me");
    expect(screen.queryByTestId("highlights-rail")).not.toBeInTheDocument();
  });

  it("opens the highlight's own stories in a viewer overlay", () => {
    mockGetUserHighlights.mockReturnValue({ ...idle, data: HIGHLIGHTS });
    renderPage("/profile/u2", "me");

    fireEvent.click(screen.getByTestId("highlight-rail-item"));

    expect(screen.getByTestId("highlight-story-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("highlight-story-image")).toHaveAttribute(
      "src",
      "https://cdn/s1.jpg"
    );
  });
});
