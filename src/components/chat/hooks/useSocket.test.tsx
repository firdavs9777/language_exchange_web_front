import "@testing-library/jest-dom";
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { logout } from "../../../store/slices/authSlice";
import { BASE_URL } from "../../../constants";
import { SocketProvider, useSocket } from "./useSocket";

// How many times the socket.io-client module has actually been evaluated.
//
// This is the assertion the whole task turns on: a logged-out visitor must not
// pay for the client at all. Jest evaluates a mock factory the first time the
// module is `require`d, and the CRA test preset compiles `import("...")` to a
// `require` inside a promise -- so this counter is a faithful stand-in for
// "webpack fetched the chunk". A static import at the top of useSocket.ts
// would make it 1 before the first test even renders.
//
// The factory touches `global` only, never a module-scope const: a static
// import would run it during module initialisation, and a TDZ crash there
// would report as "suite failed to run" instead of as the number below.
const mockIo = jest.fn();
(global as any).__btIo = (...args: any[]) => mockIo(...args);

jest.mock("socket.io-client", () => {
  (global as any).__btIoLoads = ((global as any).__btIoLoads || 0) + 1;
  return { io: (...args: any[]) => (global as any).__btIo(...args) };
});

const loadCount = (): number => (global as any).__btIoLoads || 0;

interface FakeSocket {
  id: string;
  connected: boolean;
  on: jest.Mock;
  off: jest.Mock;
  onAny: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
  fire: (event: string, ...args: any[]) => void;
  handlerCount: (event: string) => number;
}

/** A socket.io stand-in: records listeners so a test can fire server events. */
function makeFakeSocket(id: string): FakeSocket {
  const handlers: Record<string, Function[]> = {};
  const socket: FakeSocket = {
    id,
    connected: false,
    on: jest.fn((event: string, handler: Function) => {
      handlers[event] = (handlers[event] || []).concat(handler);
      return socket;
    }),
    off: jest.fn((event: string, handler: Function) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== handler);
      return socket;
    }),
    onAny: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(() => {
      socket.connected = false;
      return socket;
    }),
    removeAllListeners: jest.fn(() => {
      Object.keys(handlers).forEach((k) => delete handlers[k]);
      return socket;
    }),
    fire: (event: string, ...args: any[]) => {
      (handlers[event] || []).slice().forEach((h) => h(...args));
    },
    handlerCount: (event: string) => (handlers[event] || []).length,
  };
  return socket;
}

/** Renders the context value so assertions read the same shape consumers do. */
const Probe: React.FC = () => {
  const { socket, isConnected, emit } = useSocket();
  return (
    <div>
      <span data-testid="socket">{socket ? (socket as any).id : "none"}</span>
      <span data-testid="connected">{isConnected ? "yes" : "no"}</span>
      <span data-testid="emit">{typeof emit}</span>
    </div>
  );
};

const makeTestStore = (token?: string) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: token
      ? ({ auth: { userInfo: { user: { _id: "u1" }, token } } } as any)
      : ({ auth: { userInfo: null } } as any),
  });

async function renderProvider(store: ReturnType<typeof makeTestStore>) {
  const utils = render(
    <Provider store={store}>
      <SocketProvider>
        <Probe />
      </SocketProvider>
    </Provider>
  );
  // Let the dynamic import's microtask settle (a no-op when nothing loads).
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

beforeEach(() => {
  mockIo.mockReset();
  mockIo.mockImplementation(() => makeFakeSocket("sock-default"));
  localStorage.clear();
});

// Order matters for this one only: the module registry is shared across the
// file, so once any test has signed in, socket.io-client stays loaded. That is
// production behaviour too -- the chunk is fetched once per session.
it("never loads the socket client for a logged-out visitor", async () => {
  await renderProvider(makeTestStore());

  expect(loadCount()).toBe(0);
  expect(mockIo).not.toHaveBeenCalled();
  expect(screen.getByTestId("socket")).toHaveTextContent("none");
  expect(screen.getByTestId("connected")).toHaveTextContent("no");
  expect(screen.getByTestId("emit")).toHaveTextContent("function");
});

it("loads the client and connects with the token once a visitor is signed in", async () => {
  const sock = makeFakeSocket("sock-signed-in");
  mockIo.mockImplementation(() => sock);

  await renderProvider(makeTestStore("tok-signed-in"));

  await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));
  expect(loadCount()).toBe(1);
  expect(mockIo.mock.calls[0][0]).toBe(BASE_URL);
  expect(mockIo.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      auth: { token: "tok-signed-in" },
      transports: ["websocket", "polling"],
      reconnection: true,
    })
  );
  await waitFor(() => expect(screen.getByTestId("socket")).toHaveTextContent("sock-signed-in"));

  // The provider syncs React state off the socket's own connect/disconnect.
  act(() => {
    sock.connected = true;
    sock.fire("connect");
  });
  expect(screen.getByTestId("connected")).toHaveTextContent("yes");

  act(() => {
    sock.connected = false;
    sock.fire("disconnect", "transport close");
  });
  expect(screen.getByTestId("connected")).toHaveTextContent("no");
});

it("disconnects and drops the socket when the user signs out", async () => {
  const sock = makeFakeSocket("sock-sign-out");
  mockIo.mockImplementation(() => sock);
  const store = makeTestStore("tok-sign-out");

  await renderProvider(store);
  await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));

  await act(async () => {
    store.dispatch(logout(undefined));
    await Promise.resolve();
  });

  expect(sock.disconnect).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByTestId("socket")).toHaveTextContent("none"));
  expect(screen.getByTestId("connected")).toHaveTextContent("no");
});

it("forces a logout when the server reports an expired token or an auth error", async () => {
  const sock = makeFakeSocket("sock-auth-error");
  mockIo.mockImplementation(() => sock);
  const store = makeTestStore("tok-auth-error");

  await renderProvider(store);
  await waitFor(() => expect(sock.handlerCount("authError")).toBe(1));
  expect(sock.handlerCount("tokenExpired")).toBe(1);

  await act(async () => {
    sock.fire("authError", { error: "invalid token" });
    await Promise.resolve();
  });

  expect(store.getState().auth.userInfo).toBe(null);
  expect(sock.disconnect).toHaveBeenCalled();
});

it("reuses one socket for the same token and detaches its listeners on unmount", async () => {
  const sock = makeFakeSocket("sock-reuse");
  mockIo.mockImplementation(() => sock);

  const first = await renderProvider(makeTestStore("tok-reuse"));
  await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));
  // Two "connect" listeners: the singleton's permanent debug one, plus the
  // provider's state sync. Only the second is the provider's to remove.
  await waitFor(() => expect(sock.handlerCount("connect")).toBe(2));

  first.unmount();
  expect(sock.handlerCount("connect")).toBe(1);
  expect(sock.handlerCount("authError")).toBe(0);
  // Unmount is not a sign-out: the singleton survives so a remount (a route
  // change that re-renders the shell) does not reconnect.
  expect(sock.disconnect).not.toHaveBeenCalled();

  await renderProvider(makeTestStore("tok-reuse"));
  await waitFor(() => expect(screen.getByTestId("socket")).toHaveTextContent("sock-reuse"));
  expect(mockIo).toHaveBeenCalledTimes(1);
});
