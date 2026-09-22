import { loadGa, gaEvent, _resetGaForTests } from "./ga";

beforeEach(() => {
  _resetGaForTests();
  document.head.querySelectorAll("script[data-ga]").forEach((s) => s.remove());
});

it("does nothing without a measurement id", () => {
  expect(loadGa("")).toBe(false);
  gaEvent("page_view", { page_path: "/" });
  expect(window.dataLayer).toBeUndefined();
});

it("injects gtag once and forwards events after load", () => {
  expect(loadGa("G-TEST123")).toBe(true);
  expect(loadGa("G-TEST123")).toBe(false); // already loaded
  const script = document.head.querySelector("script[data-ga]") as HTMLScriptElement;
  expect(script.src).toContain("googletagmanager.com/gtag/js?id=G-TEST123");
  gaEvent("store_tap", { placement: "hero" });
  const layer = window.dataLayer as any[];
  expect(layer.some((args) => args[0] === "config" && args[1] === "G-TEST123")).toBe(true);
  expect(layer.some((args) => args[0] === "event" && args[1] === "store_tap")).toBe(true);
});
