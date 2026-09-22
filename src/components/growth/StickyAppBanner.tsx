import React, { useCallback, useState } from "react";
import { X } from "lucide-react";
import { isSuppressed, recordDismissal } from "./growthGate";

const storeUrlForUserAgent = (): string =>
  /Android/i.test(typeof navigator === "undefined" ? "" : navigator.userAgent)
    ? "https://play.google.com/store/apps/details?id=com.bananatalk.app"
    : "https://apps.apple.com/us/app/bananatalk-learn-meet-or-date/id6755862146";

const StickyAppBanner: React.FC = () => {
  const [hidden, setHidden] = useState(() =>
    isSuppressed("sticky-banner", {
      pathname: window.location.pathname,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
    })
  );
  const [storeUrl] = useState(storeUrlForUserAgent);

  const dismiss = useCallback(() => {
    recordDismissal("sticky-banner");
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div
      data-testid="sticky-app-banner"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-surface px-4 py-2.5 shadow-float dark:border-gray-700 dark:bg-cardbg-dark"
    >
      <span aria-hidden className="text-2xl">🍌</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-gray-900 dark:text-gray-50">
          BanaTalk is better in the app
        </p>
        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
          AI tutor, voice rooms, reels
        </p>
      </div>
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-extrabold text-white"
      >
        Install
      </a>
      <button
        type="button"
        data-testid="sticky-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-gray-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default StickyAppBanner;
