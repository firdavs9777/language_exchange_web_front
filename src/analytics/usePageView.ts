import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { trackEvent, MAX_DURATION_MS } from "./track";
import { gaEvent } from "./ga";
import { routeTemplate } from "./routeTemplate";

const isVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

export function usePageView(): void {
  const { pathname } = useLocation();
  const params = useParams();
  // The page being timed: its tracked path, visible ms banked so far, and when
  // the current visible stretch began (null while the tab is hidden).
  const page = useRef<{ path: string | null; ms: number; since: number | null }>({
    path: null,
    ms: 0,
    since: null,
  });

  const flush = () => {
    const p = page.current;
    if (p.since !== null) {
      p.ms += Date.now() - p.since;
      p.since = null;
    }
    const duration = Math.min(Math.round(p.ms), MAX_DURATION_MS);
    p.ms = 0;
    if (p.path && duration > 0) trackEvent("page_leave", { path: p.path, durationMs: duration });
  };

  // Registered once. Hidden: send what's banked and stop the clock; visible
  // again: a fresh stretch begins, so nothing is counted twice.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else if (page.current.since === null) page.current.since = Date.now();
    };
    // A restored (bfcache) page keeps running, so the clock restarts if visible.
    const onPageHide = () => {
      flush();
      if (isVisible()) page.current.since = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // A layout route's useParams() includes params of the whole matched
    // branch (react-router v6), so this covers a leaf like /profile/:userId
    // even though App itself is mounted above the leaf route.
    const tracked = routeTemplate(pathname, params);
    flush(); // the page being left
    page.current = { path: tracked, ms: 0, since: isVisible() ? Date.now() : null };
    trackEvent("page_view", { path: tracked });
    gaEvent("page_view", { page_path: tracked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
