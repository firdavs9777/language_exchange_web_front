import React from "react";
import { useTranslation } from "react-i18next";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/bananatalk-learn-meet-or-date/id6755862146";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bananatalk.app";

const HeroDemo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      data-testid="hero-demo"
      className="px-4 py-14 sm:py-20 bg-gradient-to-b from-white to-canvas dark:from-canvas-dark dark:to-canvas-dark"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <h1
            data-testid="hero-headline"
            className="text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50"
          >
            {t("home.hero.title") || "Say it badly."}{" "}
            <span className="text-brand">
              {t("home.hero.titleAccent") || "We'll translate."}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-300">
            {t("home.hero.subtitle") ||
              "Type in your language, they read it in theirs. Tap any message to see how it was really said — that's how you learn."}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              data-testid="hero-store-ios"
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            >
              App Store
            </a>
            <a
              data-testid="hero-store-android"
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            >
              Google Play
            </a>
          </div>

          <p className="mt-5 text-xs font-medium text-gray-400">
            {t("home.hero.trust") || "Free forever tier · 137 languages · AI tutor 24/7"}
          </p>
        </div>

        {/* The mechanic, shown rather than claimed. */}
        <div className="rounded-card bg-gradient-to-br from-brand/[0.08] to-banana/[0.14] p-5 motion-safe:animate-bt-float">
          <div className="flex flex-col gap-3">
            <div
              data-testid="demo-message"
              className="max-w-[86%] self-start rounded-card bg-surface p-3 shadow-card motion-safe:animate-bt-rise dark:bg-cardbg-dark"
            >
              <p className="text-sm text-gray-900 dark:text-gray-50">안녕하세요! 오늘 시간 있어요?</p>
              <p className="mt-1.5 border-t border-dashed border-gray-200 pt-1.5 text-xs text-brand dark:border-gray-600">
                Hi! Do you have time today?
              </p>
            </div>

            <div
              data-testid="demo-message"
              className="max-w-[86%] self-end rounded-card bg-brand p-3 text-white shadow-card motion-safe:animate-bt-rise"
              style={{ animationDelay: "400ms" }}
            >
              <p className="text-sm">Yes! I want practice Korean 😅</p>
              <p className="mt-1.5 border-t border-dashed border-white/40 pt-1.5 text-xs opacity-90">
                네! 한국어 연습하고 싶어요
              </p>
            </div>

            <div
              data-testid="demo-tutor-note"
              className="max-w-[94%] self-start rounded-card border-2 border-banana bg-surface p-3 shadow-card motion-safe:animate-bt-rise dark:bg-cardbg-dark"
              style={{ animationDelay: "800ms" }}
            >
              <p className="text-[10px] font-extrabold tracking-wide text-banana-dark">✦ AI TUTOR</p>
              <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                "I want to practise" — <b>practise</b> takes <i>to</i>. Try:{" "}
                <i>I want to practise Korean.</i>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroDemo;
