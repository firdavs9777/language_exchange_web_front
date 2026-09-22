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
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-surface px-4 py-3 shadow-float dark:border-gray-700 dark:bg-cardbg-dark"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {t("consent.message") || "We use analytics cookies to understand what brings people here."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            {t("consent.decline") || "No thanks"}
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-brand"
          >
            {t("consent.accept") || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBar;
