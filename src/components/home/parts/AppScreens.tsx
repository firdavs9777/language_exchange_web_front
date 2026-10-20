import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "../anim/Reveal";

// Real screens from the current app (public/app-screens/), in the app's own
// tab order: AI Study, Community, Moments. Replace the files to refresh them;
// keep them ~600px wide so the section stays light.
const SCREENS = [
  { key: "aiStudy", src: "/app-screens/ai-study.jpg", title: "AI Study", body: "A daily pack, an AI tutor and practice that fits in five minutes." },
  { key: "community", src: "/app-screens/community.jpg", title: "Daily matches", body: "Fresh partners every day who learn your language while you learn theirs." },
  { key: "moments", src: "/app-screens/moments.jpg", title: "Moments & Reels", body: "Share your day, watch reels, get corrected by native speakers." },
];

export interface AppScreensProps {
  title?: string;
}

const AppScreens: React.FC<AppScreensProps> = ({ title }) => {
  const { t } = useTranslation();
  return (
    <section data-testid="app-screens" className="px-4 py-16 bg-surface dark:bg-canvas-dark">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {title || t("home.screens.title") || "See the app"}
        </h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {SCREENS.map((s, i) => (
            <Reveal key={s.key} delayMs={i * 110}>
              <figure className="mx-auto flex max-w-[260px] flex-col items-center text-center">
                <div className="w-full overflow-hidden rounded-[2.25rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl dark:border-gray-700">
                  <img
                    src={s.src}
                    alt={t(`home.screens.items.${s.key}.title`) || s.title}
                    loading="lazy"
                    width={600}
                    height={1300}
                    className="block h-auto w-full"
                  />
                </div>
                <figcaption className="mt-4">
                  <span className="block text-base font-bold text-gray-900 dark:text-gray-50">
                    {t(`home.screens.items.${s.key}.title`) || s.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t(`home.screens.items.${s.key}.body`) || s.body}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AppScreens;
