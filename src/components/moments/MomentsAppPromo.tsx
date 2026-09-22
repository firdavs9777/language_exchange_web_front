import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ImageIcon, MessageCircle, GraduationCap, Bell } from "lucide-react";
import { SurfaceCard, Badge } from "../../design";

// Moments on web is intentionally a promotion, not the feature: the app
// version has Stories, AI Study replies on your own posts, richer reactions
// and push notifications, none of which we're rebuilding for the browser.
// The nav item stays (people expect "Moments" in the menu) but it now leads
// here instead of a stripped-down web feed that would only disappoint next
// to the real thing.
const APP_STORE_URL =
  "https://apps.apple.com/us/app/bananatalk-learn-meet-or-date/id6755862146";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bananatalk.app";

// Copy lives under moments_section.promo in every locale; the inline English
// is the codebase's standard fallback for a key that is missing everywhere.
const PERKS = [
  {
    key: "stories",
    icon: ImageIcon,
    title: "Stories that disappear",
    body: "Share a moment that lasts 24 hours, the way the app's community actually uses it.",
  },
  {
    key: "aiStudy",
    icon: GraduationCap,
    title: "AI Study replies",
    body: "Post in the language you're learning and get a gentle AI correction right in the comments.",
  },
  {
    key: "reactions",
    icon: MessageCircle,
    title: "Richer reactions",
    body: "Voice reactions, translations on tap, and comment threads built for a feed, not a form.",
  },
  {
    key: "notifications",
    icon: Bell,
    title: "Live notifications",
    body: "Know the moment someone from your target language replies — no refreshing a browser tab.",
  },
];

const MomentsAppPromo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      data-testid="moments-app-promo"
      className="px-4 py-16 bg-canvas dark:bg-canvas-dark"
    >
      <div className="mx-auto max-w-3xl text-center">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
        >
          <Sparkles className="h-7 w-7" />
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {t("moments_section.promo.title") || "Moments lives in the app now"}
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {t("moments_section.promo.subtitle") ||
            "Stories, AI Study replies, and a feed built for a phone, not a browser tab. Free to install, no account switch needed."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="moments-promo-appstore"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-brand"
          >
            {t("moments_section.promo.appStore") || "Get it on the App Store"}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="moments-promo-playstore"
            className="rounded-full border-2 border-brand px-5 py-2.5 text-sm font-extrabold text-brand-dark dark:text-brand-light"
          >
            {t("moments_section.promo.playStore") || "Get it on Google Play"}
          </a>
        </div>

        <div className="mt-12 grid gap-4 text-left sm:grid-cols-2">
          {PERKS.map(({ key, icon: Icon, title, body }) => (
            <SurfaceCard key={key} padding="lg">
              <div data-testid="moments-promo-perk" className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">
                      {t(`moments_section.promo.perks.${key}.title`) || title}
                    </h3>
                    <Badge tone="banana">
                      {t("moments_section.promo.appOnly") || "In the app"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`moments_section.promo.perks.${key}.body`) || body}
                  </p>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MomentsAppPromo;
