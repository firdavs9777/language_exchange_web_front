import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StoriesFeed from "./StoriesFeed";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

let mockUserId: string | null = "me";
jest.mock("react-redux", () => ({
  useSelector: (selector: any) =>
    selector({
      auth: { userInfo: mockUserId ? { user: { _id: mockUserId, name: "Me" } } : undefined },
    }),
}));

let mockFeed: any;
let mockMine: any;
jest.mock("../../store/slices/storiesSlice", () => ({
  useGetStoryFeedsQuery: () => mockFeed,
  useGetMyStoriesQuery: () => mockMine,
}));

beforeEach(() => {
  mockUserId = "me";
  mockFeed = { data: { success: true, data: [] }, isLoading: false };
  mockMine = { data: { success: true, data: [] }, isLoading: false };
});

it("offers the author a way into their own stories from their own ring", () => {
  render(<StoriesFeed />);
  expect(screen.getByTestId("my-stories-link")).toHaveAttribute("href", "/stories/mine");
});

it("still offers it once the author has stories of their own", () => {
  mockMine = { data: { success: true, data: [{ _id: "s-1" }] }, isLoading: false };
  render(<StoriesFeed />);
  expect(screen.getByTestId("my-stories-link")).toHaveAttribute("href", "/stories/mine");
});

it("shows nothing to a signed-out visitor, who has no stories page", () => {
  mockUserId = null;
  render(<StoriesFeed />);
  expect(screen.queryByTestId("my-stories-link")).toBeNull();
});
