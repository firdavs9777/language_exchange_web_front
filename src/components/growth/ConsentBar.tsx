import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { readConsent, writeConsent, Consent } from "../../analytics/consent";
import { loadGa, GA_MEASUREMENT_ID } from "../../analytics/ga";
import { useSurfaceOpen } from "./surfaceRegistry";

type State = "pending" | Consent | null; // pending until mounted: never in prerendered HTML

const ConsentBar: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<State>("pending");
  const popupOpen = useSurfaceOpen("download-popup");

  useEffect(() => {
    const stored = readConsent();
    setState(stored);
    if (stored === "granted") loadGa();
  }, []);

  // No measurement id: GA is inert, so asking for consent collects a decision
  // nothing acts on. Below the hooks so they still run unconditionally.
  // When GA is switched on this bar also needs a way to withdraw consent, which
  // it does not have yet (follow-up).
  if (!GA_MEASUREMENT_ID) return null;

  if (state !== null || popupOpen) return null;

  const choose = (decision: Consent) => {
    writeConsent(decision);
    setState(decision);
    if (decision === "granted") loadGa();
  };

  return (
    <div
      role="region"
      aria-label={t("consent.label") || "Cookie consent"}
      data-testid="consent-bar"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-float dark:border-line-dark dark:bg-cardbg-dark"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-snug text-ink-700 dark:text-ink-200">
          {t("consent.message") || "We use analytics cookies to understand what brings people here."}
        </p>
        {/* `brand-deep`, not `brand`: white on #00BFA5 is 2.33:1 and fails
            AA. The accept button is the one control here that must be read
            and pressed, so it cannot be the decorative tint. */}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {t("consent.decline") || "No thanks"}
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-brand-deep px-4 py-1.5 text-sm font-extrabold text-white transition-colors hover:bg-brand-deepest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            {t("consent.accept") || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBar;
