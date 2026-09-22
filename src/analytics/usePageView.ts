import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "../constants";
import { trackEvent } from "./track";
import { gaEvent } from "./ga";

// The legacy visit ping (WebVisit, geo-located server-side) stays as it was;
// it feeds the existing weekly report. The new event channel and GA sit
// alongside it.
function legacyVisitPing(pathname: string): void {
  try {
    fetch(`${BASE_URL}/api/v1/analytics/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: pathname,
        referrer: document.referrer || null,
        language: navigator.language || null,
      }),
    }).catch(() => {});
  } catch {
    // analytics must never block the UI
  }
}

export function usePageView(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    legacyVisitPing(pathname);
    trackEvent("page_view", { path: pathname });
    gaEvent("page_view", { page_path: pathname });
  }, [pathname]);
}
