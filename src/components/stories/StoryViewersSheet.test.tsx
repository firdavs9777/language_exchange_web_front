import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StoryViewersSheet from "./StoryViewersSheet";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

let mockViewersState: any = { data: undefined, isLoading: true, error: undefined };
jest.mock("../../store/slices/storiesSlice", () => ({
  useGetStoryViewersQuery: () => mockViewersState,
}));

const NOW = new Date("2026-09-24T12:00:00Z").getTime();

const renderSheet = (onClose = jest.fn()) => {
  render(
    <MemoryRouter>
      <StoryViewersSheet storyId="story-1" onClose={onClose} />
    </MemoryRouter>
  );
  return onClose;
};

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW);
  mockViewersState = { data: undefined, isLoading: true, error: undefined };
});

afterEach(() => jest.restoreAllMocks());

describe("StoryViewersSheet", () => {
  it("shows a loading state while GET /:id/views is in flight", () => {
    renderSheet();
    expect(screen.getByTestId("story-viewers-loading")).toBeInTheDocument();
  });

  it("lists each viewer with a name, a relative viewedAt and a link to their profile", () => {
    mockViewersState = {
      isLoading: false,
      error: undefined,
      data: {
        success: true,
        data: {
          viewCount: 2,
          views: [
            {
              user: { _id: "u-1", name: "Mina", imageUrls: ["https://cdn/m.jpg"] },
              viewedAt: "2026-09-24T11:30:00Z",
            },
            {
              user: { _id: "u-2", name: "Tom", images: ["https://cdn/t.jpg"] },
              viewedAt: "2026-09-23T12:00:00Z",
            },
          ],
        },
      },
    };
    renderSheet();

    const rows = screen.getAllByTestId("story-viewer-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Mina")).toBeInTheDocument();
    expect(screen.getByText("Tom")).toBeInTheDocument();
    // 30 minutes and 1 day before the frozen "now".
    expect(screen.getByText("30m ago")).toBeInTheDocument();
    expect(screen.getByText("1d ago")).toBeInTheDocument();
    expect(rows[0]).toHaveAttribute("href", "/community/u-1");
    expect(rows[1]).toHaveAttribute("href", "/community/u-2");
  });

  it("shows the view count from the response, not the row count", () => {
    mockViewersState = {
      isLoading: false,
      error: undefined,
      data: { success: true, data: { viewCount: 41, views: [] } },
    };
    renderSheet();
    expect(screen.getByTestId("story-viewers-count")).toHaveTextContent("41");
  });

  it("shows an empty state when nobody has watched yet", () => {
    mockViewersState = {
      isLoading: false,
      error: undefined,
      data: { success: true, data: { viewCount: 0, views: [] } },
    };
    renderSheet();
    expect(screen.getByTestId("story-viewers-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("story-viewer-row")).not.toBeInTheDocument();
  });

  it("shows an error state when the request fails", () => {
    mockViewersState = { isLoading: false, error: { status: 403 }, data: undefined };
    renderSheet();
    expect(screen.getByTestId("story-viewers-error")).toBeInTheDocument();
  });

  it("closes from its own close button", () => {
    mockViewersState = {
      isLoading: false,
      error: undefined,
      data: { success: true, data: { viewCount: 0, views: [] } },
    };
    const onClose = renderSheet();
    screen.getByTestId("story-viewers-close").click();
    expect(onClose).toHaveBeenCalled();
  });

  it("survives a response whose viewer was deleted (no user object)", () => {
    mockViewersState = {
      isLoading: false,
      error: undefined,
      data: {
        success: true,
        data: {
          viewCount: 1,
          views: [{ user: null, viewedAt: "2026-09-24T11:59:00Z" }],
        },
      },
    };
    renderSheet();
    // Rendered, but not as a link to /community/undefined.
    expect(screen.queryByTestId("story-viewer-row")).not.toBeInTheDocument();
    expect(screen.getByTestId("story-viewers-empty")).toBeInTheDocument();
  });
});
