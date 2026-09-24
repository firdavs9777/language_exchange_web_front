import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { logout } from '../../../store/slices/authSlice';
import { BASE_URL } from '../../../constants';

// ---- Types ----

// `socket.io-client` is loaded with `import()` below, so it must not appear in
// a static `import` declaration -- not even a type-only one: TypeScript 3.7
// has no `import type`, and a value import whose bindings happen to be used
// only as types is still a static edge as far as src/seo/eagerGraph.test.ts
// (and, historically, as far as a stray `new Socket()` would be) is concerned.
// An `import(...)` *type* is erased by Babel and invisible to webpack.
type Socket = import('socket.io-client').Socket;
type IoFactory = typeof import('socket.io-client').io;

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any, callback?: (response: any) => void) => void;
}

// ---- Lazy client ----

/**
 * The socket.io client, fetched the first time somebody is signed in.
 *
 * ~13 KB gzipped (engine.io, the parsers, the reconnect manager) that a
 * logged-out visitor on a marketing page can never use: there is no token to
 * authenticate with, so the only thing importing it eagerly bought was a
 * bigger main.js for every crawler and every first-time reader. The promise is
 * cached, so a sign-out/sign-in round trip re-uses the chunk the browser
 * already has.
 *
 * The chunk is named `socketio` on purpose -- no dot, no hyphen. The check
 * that this split is real is `grep -c "socket.io" build/static/js/main.*.js`,
 * and webpack writes every named chunk into the runtime's id->name map inside
 * main.js, so a name containing the package's own spelling would answer that
 * grep with a 1 forever after.
 */
let ioLoader: Promise<IoFactory> | null = null;

function loadIo(): Promise<IoFactory> {
  if (!ioLoader) {
    ioLoader = import(/* webpackChunkName: "socketio" */ 'socket.io-client').then((m) => m.io);
  }
  return ioLoader;
}

// ---- Module-level singleton ----

let globalSocket: Socket | null = null;
let globalToken: string | null = null;

function getOrCreateSocket(io: IoFactory, token: string): Socket {
  // Reuse existing socket if token hasn't changed (don't check .disconnected —
  // a socket that's still connecting has disconnected=true, which would cause
  // a duplicate connection on React StrictMode remount)
  if (globalSocket && globalToken === token) {
    console.log('[Socket] Reusing existing socket:', globalSocket.id, 'connected:', globalSocket.connected, 'disconnected:', globalSocket.disconnected);
    return globalSocket;
  }

  // Clean up old socket only if token actually changed
  if (globalSocket) {
    console.log('[Socket] Token changed, destroying old socket:', globalSocket.id);
    globalSocket.removeAllListeners();
    globalSocket.disconnect();
    globalSocket = null;
  }

  globalToken = token;
  globalSocket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
  });

  const s = globalSocket;

  // Permanent debug listener on the singleton - never removed
  s.onAny((event, ...args) => {
    console.log(`[Socket:${s.id}] << ${event}`, args);
  });

  s.on('connect', () => {
    console.log(`[Socket] Connected as: ${s.id}`);
  });

  s.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${reason}`);
  });

  s.on('connect_error', (err) => {
    console.error(`[Socket] Connect error: ${err.message}`);
  });

  return globalSocket;
}

/**
 * Tear the singleton down. Called when the session ends — a sign-out, or the
 * `authError`/`tokenExpired` push that forces one — and when the token
 * rotates under us; never on unmount: a route change re-mounts the provider
 * and must not reconnect.
 */
function destroySocket(reason: string): void {
  if (!globalSocket) return;
  console.log(`[Socket] ${reason}, destroying socket:`, globalSocket.id);
  globalSocket.removeAllListeners();
  globalSocket.disconnect();
  globalSocket = null;
  globalToken = null;
}

// ---- Context ----

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  emit: () => {},
});

// ---- Provider ----

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = useSelector((state: RootState) => state.auth.userInfo?.token);
  const dispatch = useDispatch();

  useEffect(() => {
    // Logged out: nothing to connect to, and nothing to download. Anything the
    // previous session left open is closed here — this is the sign-out path.
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      destroySocket('Signed out');
      return;
    }

    // The token rotated without a sign-out. This is a real path, not a
    // hypothetical one: baseQueryWithReauth dispatches `setCredentials` with a
    // fresh token after a silent 401 refresh, which re-runs this effect with a
    // new, non-null token.
    //
    // Before the client was lazy, the swap happened inside one synchronous
    // effect body, so no render ever saw the old socket after the new token
    // arrived. `loadIo()` now resolves a microtask later (the promise is
    // cached, but a promise is still a promise), and in that gap `socket`
    // would still be the old object with consumer listeners attached to it —
    // a socket about to be destroyed. So close it here, synchronously, and let
    // consumers see `null` in the gap exactly as they do when logged out:
    // every one of them already guards on it, and their effects key on
    // `[socket]`, so they re-attach when the new one arrives.
    if (globalToken && globalToken !== token) {
      setSocket(null);
      setIsConnected(false);
      destroySocket('Token rotated');
    }

    // Sync React state with socket connection state
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    // Backend pushes these when the access token is on its way out / already
    // invalid. We treat expired/authError as a definitive logout signal —
    // the REST baseQueryWithReauth handles the silent-refresh case on its
    // own, this branch covers the case where the server has already given up.
    const onTokenExpired = (data?: { reason?: string }) => {
      console.warn('[Socket] tokenExpired — forcing logout', data);
      dispatch(logout());
    };

    const onAuthError = (data?: { error?: string }) => {
      console.warn('[Socket] authError — forcing logout', data);
      dispatch(logout());
    };

    // Heads-up only — log so we can correlate against refresh attempts. The
    // next REST call's 401 path will rotate the token automatically.
    const onTokenExpiring = (data?: { secondsRemaining?: number }) => {
      console.info('[Socket] tokenExpiring', data);
    };

    // The chunk arrives a tick (or a network round trip) later, so the effect
    // may already have been cleaned up by then — `cancelled` is what keeps a
    // signed-out provider from attaching listeners to a socket it will never
    // read, and `attached` is what the cleanup detaches.
    let cancelled = false;
    let attached: Socket | null = null;

    loadIo().then(
      (io) => {
        if (cancelled) return;
        const s = getOrCreateSocket(io, token);
        attached = s;
        setSocket(s);

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        s.on('tokenExpired', onTokenExpired);
        s.on('tokenExpiring', onTokenExpiring);
        s.on('authError', onAuthError);

        // If already connected (reusing existing socket), sync state
        if (s.connected) {
          setIsConnected(true);
        }
      },
      (err) => {
        // A failed chunk leaves chat inert rather than broken: every consumer
        // guards on a null socket, and the next sign-in retries the import.
        ioLoader = null;
        console.error('[Socket] Failed to load the realtime client', err);
      }
    );

    return () => {
      cancelled = true;
      if (!attached) return;
      attached.off('connect', onConnect);
      attached.off('disconnect', onDisconnect);
      attached.off('tokenExpired', onTokenExpired);
      attached.off('tokenExpiring', onTokenExpiring);
      attached.off('authError', onAuthError);
    };
  }, [token, dispatch]);

  const emit = useCallback((event: string, data?: any, callback?: (response: any) => void) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, data, callback);
    }
  }, []);

  const value: SocketContextValue = {
    socket,
    isConnected,
    emit,
  };

  return React.createElement(SocketContext.Provider, { value }, children);
};

// ---- Hook ----

export const useSocket = () => useContext(SocketContext);

export default useSocket;
