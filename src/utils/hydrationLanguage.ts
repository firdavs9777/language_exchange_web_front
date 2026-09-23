import { i18n as I18n } from "i18next";

// Prerendered HTML is English. To hydrate without a mismatch the first client
// render must be English too; the visitor's language is restored in an effect
// after commit (App.tsx). The language detector caches every changeLanguage
// to localStorage, so the stored choice is snapshotted and put back.
//
// Since the 17 non-English locales became chunks, "what language does this
// visitor want" can no longer be read off `i18n.language`: on a prerendered
// page src/utils/i18n.ts pins the init to the inlined English precisely so
// nothing loads under React, which leaves `i18n.language` at "en" for everyone.
// So the detector is run here instead -- the same detector, the same order
// (?lang=, localStorage, navigator, htmlTag), resolved through i18next's own
// `getBestMatchFromCodes` so `supportedLngs` / `nonExplicitSupportedLngs` /
// `load: "languageOnly"` all mean what they mean everywhere else.
const STORAGE_KEY = "i18nextLng";
let pending: string | null = null;

const safeGet = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
const safeSet = (value: string | null): void => {
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable; the effect restores the language anyway */
  }
};

/**
 * The visitor's language, as i18next itself would resolve it.
 *
 * Falls back to `i18n.language` when the instance has no detector -- which is
 * every bare `createInstance()` in a unit test, and nothing in production.
 */
function detectVisitorLanguage(i18n: I18n): string {
  const services = (i18n as any).services || {};
  const detector = services.languageDetector;
  const utils = services.languageUtils;
  if (detector && typeof detector.detect === "function" && utils && utils.getBestMatchFromCodes) {
    const codes = detector.detect();
    const best = utils.getBestMatchFromCodes(typeof codes === "string" ? [codes] : codes);
    if (best) return best;
  }
  return i18n.language || "en";
}

/** Call before hydrateRoot. Returns the language the visitor will get back. */
export function prepareForHydration(i18n: I18n): string {
  const detected = detectVisitorLanguage(i18n);
  if (detected.split("-")[0] !== "en") {
    const stored = safeGet();
    // Normally already "en" (i18n.ts pinned the init); a client-rendered entry
    // that somehow got here is put back to English the old way.
    if (i18n.language !== "en") i18n.changeLanguage("en");
    safeSet(stored);
    pending = detected;
  }
  return detected;
}

/**
 * Call from an effect after the first commit. No-op when nothing is pending.
 *
 * Deliberately fire-and-forget: since task D1 the visitor's locale is a lazy
 * chunk, so `changeLanguage` is a promise. i18next loads the bundle *before*
 * it switches and emits `languageChanged`, so the English first render simply
 * stays on screen until the JSON lands -- there is no window in which `t()`
 * returns a raw key or the "" that `parseMissingKeyHandler` yields.
 */
export function restoreAfterHydration(i18n: I18n): void {
  if (pending && pending !== i18n.language) void i18n.changeLanguage(pending);
  pending = null;
}

export function _resetHydrationLanguageForTests(): void {
  pending = null;
}
