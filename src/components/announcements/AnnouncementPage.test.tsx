import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import AnnouncementPage from "./AnnouncementPage";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }) }));
let mockUser: any = { user: { _id: "u1" } };
jest.mock("react-redux", () => ({ useSelector: (fn: any) => fn({ auth: { userInfo: mockUser } }) }));
const mockQuery = jest.fn();
jest.mock("../../store/slices/announcementsSlice", () => ({ useGetPublicAnnouncementQuery: (...a: any[]) => mockQuery(...a) }));

const Where = () => <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;
const renderPage = () => render(
  <MemoryRouter initialEntries={["/announcement/a1"]}>
    <Routes>
      <Route path="/announcement/:id" element={<AnnouncementPage />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>);

beforeEach(() => { mockUser = { user: { _id: "u1" } }; mockQuery.mockReset(); });

test("shows the full announcement, keeping line breaks", () => {
  mockQuery.mockReturnValue({ data: { id: "a1", title: "T", body: "L1\nL2", emoji: "🎉", imageUrl: null, buttonLabel: null, buttonUrl: null, priority: 0, displayStyle: "popup" } });
  renderPage();
  expect(screen.getByRole("heading", { name: "T" })).toBeInTheDocument();
  expect(screen.getByTestId("ann-page-body")).toHaveClass("whitespace-pre-line");
  expect(mockQuery).toHaveBeenCalledWith({ id: "a1", lang: "en" }, { skip: false });
});

test("404 shows the ended message", () => {
  mockQuery.mockReturnValue({ error: { status: 404 } });
  renderPage();
  expect(screen.getByText("announcements.ended")).toBeInTheDocument();
});

test("logged out redirects to login and back", () => {
  mockUser = null;
  mockQuery.mockReturnValue({});
  renderPage();
  expect(screen.getByTestId("where")).toHaveTextContent("/login?redirect=%2Fannouncement%2Fa1");
});
