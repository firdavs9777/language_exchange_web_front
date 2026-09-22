import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { apiSlice } from "../../store/slices/apiSlice";
import MainNavbar from "./MainNavbar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en", changeLanguage: jest.fn() } }),
}));

jest.mock("../chat/hooks/useSocket", () => ({
  useSocket: () => ({ socket: null, isConnected: false, emit: jest.fn() }),
}));

function makeStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (state: any = { userInfo: { user: { _id: "me", name: "Me" } } }) => state,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

function mockConversationsFetch(conversations: any[]) {
  (global as any).fetch = jest.fn(async () =>
    new Response(JSON.stringify({ data: conversations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function renderNavbar() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <MainNavbar />
      </MemoryRouter>
    </Provider>
  );
}

it("shows no unread badge when every conversation is read", async () => {
  mockConversationsFetch([
    { _id: "c1", unreadCount: 0 },
    { _id: "c2", unreadCount: 0 },
  ]);
  renderNavbar();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.queryByTestId("chat-unread-badge")).not.toBeInTheDocument();
});

it("sums unread counts across conversations into the navbar badge", async () => {
  mockConversationsFetch([
    { _id: "c1", unreadCount: 2 },
    { _id: "c2", unreadCount: 3 },
  ]);
  renderNavbar();
  await waitFor(() => expect(screen.getByTestId("chat-unread-badge")).toBeInTheDocument());
  expect(screen.getByTestId("chat-unread-badge")).toHaveTextContent("5");
});

it("caps the displayed badge at 99+", async () => {
  mockConversationsFetch([{ _id: "c1", unreadCount: 150 }]);
  renderNavbar();
  await waitFor(() => expect(screen.getByTestId("chat-unread-badge")).toBeInTheDocument());
  expect(screen.getByTestId("chat-unread-badge")).toHaveTextContent("99+");
});
