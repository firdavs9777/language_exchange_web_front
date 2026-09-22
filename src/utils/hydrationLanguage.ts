import { i18n as I18n } from "i18next";

// Prerendered HTML is English. To hydrate without a mismatch the first client
// render must be English too; the visitor's language is restored in an effect
// after commit (App.tsx). The language detector caches every changeLanguage
// to localStorage, so the stored choice is snapshotted and put back.
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

/** Call before hydrateRoot. Returns the language the visitor will get back. */
export function prepareForHydration(i18n: I18n): string {
  const detected = i18n.language || "en";
  if (detected.split("-")[0] !== "en") {
    const stored = safeGet();
    i18n.changeLanguage("en");
    safeSet(stored);
    pending = detected;
  }
  return detected;
}

/** Call from an effect after the first commit. No-op when nothing is pending. */
export function restoreAfterHydration(i18n: I18n): void {
  if (pending && pending !== i18n.language) i18n.changeLanguage(pending);
  pending = null;
}

export function _resetHydrationLanguageForTests(): void {
  pending = null;
}
