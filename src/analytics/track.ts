import { BASE_URL, ANALYTICS_EVENTS_URL } from "../constants";

export type EventName = "page_view" | "page_leave" | "store_tap" | "signup_start";

export type UtmKey = "source" | "medium" | "campaign" | "content" | "term";

export interface EventData {
  path?: string;
  placement?: string;
  platform?: "ios" | "android" | "web";
  referrer?: string;
  language?: string;
  landing?: boolean;
  utm?: Partial<Record<UtmKey, string>>;
  durationMs?: number;
}

// First-party events: POST /api/v1/analytics/events (controllers/webEvents.js).
// Independent of GA and of consent: the payload carries a per-tab session id;
// a signed-in member's token lets the server attach the member. Fire-and-forget,
// one retry, never throws.

const SESSION_KEY = "bt.sid";
const SESSION_AT_KEY = "bt.sidAt";
const LANDED_KEY = "bt.landed";
const IDLE_MS = 30 * 60 * 1000;
export const MAX_DURATION_MS = 1_800_000;
const UTM_KEYS: UtmKey[] = ["source", "medium", "campaign", "content", "term"];
const OWN_HOSTS = ["banatalk.com", "www.banatalk.com"];

// sessionStorage can be blocked; fall back to memory so a session still holds.
const memo: Record<string, string> = {};
function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return memo[key] ?? null;
  }
}
function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    memo[key] = value;
  }
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// The tab's session id. After 30 minutes without an event a new one is minted
// (rotate=false leaves the old one alone, for page_leave).
export function sessionId(rotate = true): string {
  const existing = read(SESSION_KEY);
  if (existing) {
    const at = Number(read(SESSION_AT_KEY));
    const idle = at > 0 && Date.now() - at > IDLE_MS;
    if (!idle || !rotate) return existing;
  }
  const id = randomId();
  write(SESSION_KEY, id);
  return id;
}

function touchSession(): void {
  write(SESSION_AT_KEY, String(Date.now()));
}

function externalReferrer(raw: string): string | null {
  if (!raw) return null;
  try {
    const host = new URL(raw).host;
    if (host === window.location.host || OWN_HOSTS.includes(host)) return null;
    return raw;
  } catch {
    return null;
  }
}

function utmFromLocation(): Partial<Record<UtmKey, string>> | undefined {
  const sp = new URLSearchParams(window.location.search);
  const utm: Partial<Record<UtmKey, string>> = {};
  for (const k of UTM_KEYS) {
    const v = sp.get(`utm_${k}`);
    if (v) utm[k] = v.slice(0, 128);
  }
  return Object.keys(utm).length ? utm : undefined;
}

export function buildPayload(name: EventName, data: EventData) {
  const sid = sessionId(name !== "page_leave");
  // The first page_view of a session (a new tab, or after 30 idle minutes) is
  // the landing view; only it carries the referrer and campaign tags.
  let landing = data.landing === true;
  if (name === "page_view" && data.landing === undefined && read(LANDED_KEY) !== sid) landing = true;
  if (name === "page_view" && landing) write(LANDED_KEY, sid);
  const payload: Record<string, unknown> = {
    name,
    path: data.path || window.location.pathname,
    placement: data.placement || null,
    platform: data.platform || null,
    referrer: landing ? externalReferrer(data.referrer ?? document.referrer) : null,
    language: data.language || navigator.language || null,
    sessionId: sid,
    landing,
  };
  if (landing) {
    const utm = data.utm ?? utmFromLocation();
    if (utm) payload.utm = utm;
  }
  if (name === "page_leave" && typeof data.durationMs === "number") payload.durationMs = data.durationMs;
  return payload as {
    name: EventName; path: string; placement: string | null; platform: string | null;
    referrer: string | null; language: string | null; sessionId: string; landing: boolean;
    utm?: Partial<Record<UtmKey, string>>; durationMs?: number;
  };
}

// The signed-in member's token, read from the Redux store lazily: importing the
// store at module load would cycle (store -> slices -> components -> track).
function getAuthToken(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const store = require("../store").default;
    const fromStore = store?.getState?.()?.auth?.userInfo?.token;
    if (fromStore) return fromStore;
  } catch {
    /* fall through to storage */
  }
  // Prerendered pages start the store logged out and restore the session in
  // App's mount effect, which runs after the first page_view: read storage.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readStoredUserInfo } = require("../store/slices/authSlice");
    return readStoredUserInfo()?.token || undefined;
  } catch {
    return undefined;
  }
}

function suppressed(path: string): boolean {
  if (typeof navigator !== "undefined" && navigator.webdriver === true) return true;
  return /^\/admin(\/|$)/.test(path);
}

async function post(body: string, token?: string): Promise<Response | null> {
  try {
    return await fetch(`${BASE_URL}${ANALYTICS_EVENTS_URL}`, {
      method: "POST",
      headers: token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    return null; // network error: worth one retry
  }
}

// A 4xx means the request itself was rejected (bad payload, validation) --
// retrying sends the same bad request again, so it's treated as final. A
// network failure or a 5xx is worth the one retry.
function shouldRetry(res: Response | null): boolean {
  if (res === null) return true;
  if (res.ok) return false;
  return !(res.status >= 400 && res.status < 500);
}

export function trackEvent(name: EventName, data: EventData = {}): void {
  if (typeof window === "undefined") return; // prerender: nothing to measure
  let body: string;
  let token: string | undefined;
  try {
    const path = data.path || window.location.pathname;
    if (suppressed(path)) return;
    body = JSON.stringify(buildPayload(name, data));
    if (name !== "page_leave") touchSession();
    token = getAuthToken();
  } catch {
    return;
  }
  void (async () => {
    const first = await post(body, token);
    if (shouldRetry(first)) await post(body, token);
  })();
}
