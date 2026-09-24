import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { readConsent, subscribeConsentManager } from "../../analytics/consent";
import { useConsentChoice } from "../../analytics/useConsentChoice";
import { loadGa, GA_MEASUREMENT_ID } from "../../analytics/ga";
import { useSurfaceOpen } from "./surfaceRegistry";

const ACCEPT_CLASS =
  "rounded-full bg-brand-deep px-4 py-1.5 text-sm font-extrabold text-white transition-colors hover:bg-brand-deepest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep";
const QUIET_CLASS =
  "rounded-full border border-line-strong px-4 py-1.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800";
const PANEL_CLASS =
  "fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-float dark:border-line-dark dark:bg-cardbg-dark";

const ConsentBar: React.FC = () => {
  const { t } = useTranslation();
  const { state, accept, decline } = useConsentChoice();
  const [manage, setManage] = useState(false);
  const popupOpen = useSurfaceOpen("download-popup");

  useEffect(() => {
    if (readConsent() === "granted") loadGa();
  }, []);

  // The footer link, the settings row and the policy page all reach the
  // manager through this, from wherever they are in the tree.
  useEffect(() => subscribeConsentManager(() => setManage(true)), []);

  // No measurement id: GA is inert, so asking for consent — or offering to
  // withdraw it — collects a decision nothing acts on. Below the hooks so they
  // still run unconditionally.
  if (!GA_MEASUREMENT_ID) return null;

  // Opened deliberately, so it outranks the download popup and shows whatever
  // the current choice is, including "not decided yet".
  if (manage) {
    return (
      <div
        role="region"
        aria-label={t("consent.manage.title") || "Privacy choices"}
        data-testid="consent-manager"
        className={PANEL_CLASS}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-[14rem] flex-1">
            <p className="text-sm font-extrabold text-ink-900 dark:text-white">
              {t("consent.manage.title") || "Privacy choices"}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-ink-700 dark:text-ink-200">
              {state === "granted" || state === "denied"
                ? state === "granted"
                  ? t("consent.manage.current_granted") || "Analytics cookies are on."
                  : t("consent.manage.current_denied") || "Analytics cookies are off."
                : t("consent.manage.body") ||
                  "Analytics cookies tell us which pages people find useful. Nothing else."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={decline} className={QUIET_CLASS}>
              {t("consent.manage.decline") || "Turn off"}
            </button>
            <button type="button" onClick={accept} className={ACCEPT_CLASS}>
              {t("consent.manage.accept") || "Turn on"}
            </button>
            <button type="button" onClick={() => setManage(false)} className={QUIET_CLASS}>
              {t("consent.manage.done") || "Done"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state !== null || popupOpen) return null;

  return (
    <div
      role="region"
      aria-label={t("consent.label") || "Cookie consent"}
      data-testid="consent-bar"
      className={PANEL_CLASS}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-snug text-ink-700 dark:text-ink-200">
          {t("consent.message") || "We use analytics cookies to understand what brings people here."}
        </p>
        {/* `brand-deep`, not `brand`: white on #00BFA5 is 2.33:1 and fails
            AA. The accept button is the one control here that must be read
            and pressed, so it cannot be the decorative tint. */}
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={decline} className={QUIET_CLASS}>
            {t("consent.decline") || "No thanks"}
          </button>
          <button type="button" onClick={accept} className={ACCEPT_CLASS}>
            {t("consent.accept") || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBar;
