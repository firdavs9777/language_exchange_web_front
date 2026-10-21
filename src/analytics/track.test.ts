import { trackEvent, sessionId, buildPayload } from "./track";

const flush = () => new Promise((r) => setTimeout(r, 0));

let mockToken: string | undefined;
jest.mock("../store", () => ({
  __esModule: true,
  default: { getState: () => ({ auth: { userInfo: mockToken ? { token: mockToken } : null } }) },
}));

beforeEach(() => {
  window.sessionStorage.clear();
  mockToken = undefined;
  (global as any).fetch = jest.fn(async () => new Response(null, { status: 204 }));
});

it("keeps one session id per tab, 32 hex chars", () => {
  const a = sessionId();
  expect(a).toMatch(/^[a-f0-9]{32}$/);
  expect(sessionId()).toBe(a);
  expect(window.sessionStorage.getItem("bt.sid")).toBe(a);
});

it("builds the payload the backend validates", () => {
  const p = buildPayload("store_tap", { placement: "hero", platform: "ios", path: "/x" });
  expect(p).toEqual({
    name: "store_tap", path: "/x", placement: "hero", platform: "ios",
    referrer: null, language: expect.any(String), sessionId: sessionId(), landing: false,
  });
  expect(buildPayload("page_view", {}).path).toBe(window.location.pathname);
});

it("landing view carries external referrer and utm; internal referrer is dropped", () => {
  window.history.pushState({}, "", "/?utm_source=ig&utm_campaign=oct");
  Object.defineProperty(document, "referrer", { value: "https://instagram.com/", configurable: true });
  const first = buildPayload("page_view", { path: "/" });
  expect(first.landing).toBe(true);
  expect(first.referrer).toBe("https://instagram.com/");
  expect(first.utm).toEqual({ source: "ig", campaign: "oct" });
  const second = buildPayload("page_view", { path: "/about" });
  expect(second.landing).toBe(false);
  expect(second.referrer).toBeNull();
  expect(second.utm).toBeUndefined();

  window.sessionStorage.clear();
  Object.defineProperty(document, "referrer", { value: "https://banatalk.com/x", configurable: true });
  expect(buildPayload("page_view", { path: "/" }).referrer).toBeNull();
  window.sessionStorage.clear();
  Object.defineProperty(document, "referrer", { value: `${window.location.origin}/y`, configurable: true });
  expect(buildPayload("page_view", { path: "/" }).referrer).toBeNull();
  Object.defineProperty(document, "referrer", { value: "", configurable: true });
  window.history.pushState({}, "", "/");
});

it("posts once on success", async () => {
  trackEvent("page_view", { path: "/" });
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toContain("/api/v1/analytics/events");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body).name).toBe("page_view");
  expect(init.headers.Authorization).toBeUndefined();
});

it("sends the Authorization header when signed in", async () => {
  mockToken = "tok123";
  trackEvent("store_tap", { path: "/" });
  await flush();
  const [, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(init.headers.Authorization).toBe("Bearer tok123");
});

it("retries exactly once, then stays silent", async () => {
  (global as any).fetch = jest.fn(async () => { throw new Error("offline"); });
  expect(() => trackEvent("store_tap", { placement: "final-cta" })).not.toThrow();
  await flush();
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

it("does not retry a 4xx: the request itself was rejected", async () => {
  (global as any).fetch = jest.fn(async () => new Response(null, { status: 400 }));
  trackEvent("page_view", { path: "/" });
  await flush();
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("sends nothing on /admin paths", async () => {
  trackEvent("page_view", { path: "/admin" });
  trackEvent("page_view", { path: "/admin/reports" });
  await flush();
  expect(global.fetch).not.toHaveBeenCalled();
  trackEvent("page_view", { path: "/administrators" });
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("sends nothing under navigator.webdriver", async () => {
  Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
  try {
    trackEvent("page_view", { path: "/" });
    await flush();
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  }
});

it("starts a new session after 30 minutes idle and the next view is a landing", () => {
  jest.useFakeTimers();
  try {
    const a = buildPayload("page_view", { path: "/" });
    trackEvent("page_view", { path: "/" });
    expect(a.landing).toBe(true);
    jest.advanceTimersByTime(10 * 60 * 1000);
    const b = buildPayload("page_view", { path: "/b" });
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.landing).toBe(false);
    trackEvent("page_view", { path: "/b" });
    jest.advanceTimersByTime(31 * 60 * 1000);
    const c = buildPayload("page_view", { path: "/c" });
    expect(c.sessionId).not.toBe(a.sessionId);
    expect(c.landing).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});

describe("first page_view on a prerendered page (store still logged out)", () => {
  afterEach(() => window.localStorage.removeItem("userInfo"));
  const lastHeaders = () => ((global as any).fetch as jest.Mock).mock.calls.at(-1)[1].headers;

  it("carries the login restored from storage", async () => {
    window.localStorage.setItem("userInfo", JSON.stringify({ token: "stored-tok", user: { _id: "u1" } }));
    trackEvent("page_view", { path: "/" });
    await flush();
    expect(lastHeaders().Authorization).toBe("Bearer stored-tok");
  });

  it("sends no Authorization with neither store nor storage", async () => {
    trackEvent("page_view", { path: "/" });
    await flush();
    expect(lastHeaders().Authorization).toBeUndefined();
  });
});
