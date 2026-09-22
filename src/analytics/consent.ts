export type Consent = "granted" | "denied";

const KEY = "bt.consent";

/** null = undecided. Storage that throws (private modes) reads as undecided. */
export function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consent): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // The bar will show again next visit. Acceptable.
  }
}
