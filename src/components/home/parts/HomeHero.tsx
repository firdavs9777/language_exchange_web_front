import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Flame, Languages } from "lucide-react";
import brandLogo from "../../../assets/logo.png";
import { useGetPublicStatsQuery, formatCount } from "../../../store/slices/publicStatsSlice";
import PhoneFrame from "./PhoneFrame";
import StoreButtons from "./StoreButtons";

// Fixed language count, the same curated figure the stat strip and the
// marquee caption state (src/data/marqueeLanguages + generate-language-data).
const LANGUAGE_COUNT = "137";

/**
 * Soft colour blobs behind the hero: the app's yellow, teal, a coral and the
 * Study Hub violet. Pure CSS, aria-hidden, and positioned with logical
 * properties so the composition mirrors in Arabic.
 */
const Blobs: React.FC = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <span className="absolute -top-24 start-[-6rem] h-72 w-72 rounded-full bg-[#FFD93D] opacity-40 blur-3xl dark:opacity-[0.12]" />
    <span className="absolute top-1/3 end-[-5rem] h-80 w-80 rounded-full bg-[#6C63FF] opacity-[0.25] blur-3xl dark:opacity-20" />
    <span className="absolute bottom-[-6rem] start-1/4 h-72 w-72 rounded-full bg-[#FF8A80] opacity-30 blur-3xl dark:opacity-[0.12]" />
    <span className="absolute top-10 start-1/2 h-64 w-64 rounded-full bg-[#4DBFA8] opacity-30 blur-3xl dark:opacity-20" />
  </div>
);

/** A small floating label beside the phones. Decorative: the page says all of this in text. */
const Chip: React.FC<{ className: string; delay?: string; children: React.ReactNode }> = ({
  className,
  delay = "0s",
  children,
}) => (
  <span
    aria-hidden
    style={{ animationDelay: delay }}
    className={`absolute z-30 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-[0.75rem] py-[0.25rem].5 text-xs font-bold text-ink-900 shadow-lift ring-1 ring-black/5 motion-safe:animate-bt-float sm:text-sm dark:bg-cardbg-dark dark:text-gray-50 dark:ring-white/10 ${className}`}
  >
    {children}
  </span>
);

const HomeHero: React.FC = () => {
  const { t } = useTranslation();
  const { data } = useGetPublicStatsQuery();
  // The endpoint rounds down and returns null under 1,000 -- no number is
  // shown unless the server has one.
  const learners = data && data.learners ? data.learners : null;

  return (
    <section
      data-testid="home-hero"
      className="relative overflow-hidden bg-gradient-to-br from-[#EFFCF7] via-[#D5F4EA] to-[#B9EBDD] px-[1rem] pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-20 dark:from-[#0E1F1D] dark:via-[#112825] dark:to-canvas-dark"
    >
      <Blobs />

      <div className="relative z-10 mx-[auto] grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        {/* Not `text-center`: bootstrap ships `.text-center` with !important, which
            would beat `lg:text-start`. */}
        <div className="[text-align:center] lg:[text-align:start]">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/70 py-[0.25rem].5 pe-[1rem] ps-1.5 shadow-card ring-1 ring-black/5 backdrop-blur dark:bg-white/10 dark:ring-white/10">
            <img src={brandLogo} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
            <span className="text-xs font-bold tracking-wide text-ink-800 dark:text-gray-100">
              {t("home.v2.hero.eyebrow") || "Learn · Chat · Meet"}
            </span>
          </div>

          <h1
            data-testid="hero-headline"
            className="mt-[1.25rem] font-display text-[2.35rem] font-extrabold leading-[1.05] tracking-tight text-[#1B1B2F] sm:text-display-xl lg:text-[4rem] dark:text-white"
          >
            {t("home.v2.hero.title") || "Speak a new language with real people"}{" "}
            <span className="bg-gradient-to-r from-[#00A88E] via-[#3FB39C] to-[#6C63FF] bg-clip-text text-transparent dark:from-brand-light dark:to-[#A39DFF]">
              {t("home.v2.hero.titleAccent") || "— free."}
            </span>
          </h1>

          <p className="mx-[auto] mt-[1.25rem] max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg lg:mx-0 dark:text-gray-300">
            {t("home.v2.hero.subtitle") ||
              "Chat with native speakers, get instant translations and corrections, and practise every day with an AI tutor."}
          </p>

          <div className="mt-8 flex flex-col items-center gap-[1rem] lg:items-start">
            <StoreButtons placement="hero" className="justify-center lg:justify-start" />
            <a
              href="/register"
              data-testid="hero-web-cta"
              className="group inline-flex items-center gap-1.5 rounded-full px-[0.5rem] py-[0.25rem] text-sm font-bold text-brand-deep hover:text-brand-deepest dark:text-brand-light dark:hover:text-brand-light"
            >
              {t("home.v2.hero.web") || "Or use BananaTalk on the web"}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </a>
          </div>

          <ul
            data-testid="hero-proof"
            className="mb-[0px] mt-6 flex flex-wrap items-center justify-center gap-x-5 ps-[0px] gap-y-2 text-sm text-ink-600 lg:justify-start dark:text-gray-300"
          >
            {learners !== null && (
              <li data-testid="hero-proof-learners" className="inline-flex items-center gap-1.5">
                <b className="font-display text-base font-extrabold text-[#1B1B2F] dark:text-white">
                  {formatCount(learners)}+
                </b>
                {t("home.v2.hero.proofLearners") || "learners"}
              </li>
            )}
            <li className="inline-flex items-center gap-1.5">
              <b className="font-display text-base font-extrabold text-[#1B1B2F] dark:text-white">{LANGUAGE_COUNT}</b>
              {t("home.v2.hero.proofLanguages") || "languages"}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="h-4 w-4 text-brand-dark dark:text-brand-light" />
              {t("home.v2.hero.proofFree") || "Free to start"}
            </li>
          </ul>
        </div>

        {/* Three phones, chat in front. On a 360px screen they shrink and
            tuck together instead of stacking, so the hero stays one screen
            plus a scroll rather than three. */}
        <div className="relative mx-[auto] h-[25rem] w-full max-w-[22rem] sm:h-[34rem] sm:max-w-[30rem] lg:h-[38rem] lg:max-w-none">
          <PhoneFrame
            shot="app-study"
            alt={t("home.v2.alt.study") || "BananaTalk Study Hub with a daily lesson, XP and streak"}
            className="absolute start-[0px] top-10 z-10 w-[9.5rem] -rotate-6 rtl:rotate-6 sm:start-2 sm:w-[12.5rem] lg:start-6 lg:w-[14rem]"
          />
          <PhoneFrame
            shot="app-community"
            alt={t("home.v2.alt.community") || "BananaTalk Community with today's language partner matches"}
            className="absolute end-[0px] top-10 z-10 w-[9.5rem] rotate-6 rtl:-rotate-6 sm:end-2 sm:w-[12.5rem] lg:end-6 lg:w-[14rem]"
          />
          <PhoneFrame
            shot="app-chat"
            eager
            alt={t("home.v2.alt.chat") || "A BananaTalk chat with a native speaker"}
            className="absolute start-1/2 top-[0px] z-20 w-[11.25rem] -translate-x-1/2 rtl:translate-x-1/2 sm:w-[15rem] lg:w-[16.5rem]"
          />

          <Chip className="start-[-0.25rem] top-2 sm:start-0 sm:top-6">👋 {t("home.v2.chips.hi") || "Hi!"}</Chip>
          <Chip delay="1.2s" className="end-[-0.25rem] top-[45%] text-brand-deep sm:end-0">
            <Languages aria-hidden className="h-4 w-4 text-brand" />
            {t("home.v2.chips.translated") || "Translated"} ✓
          </Chip>
          <Chip delay="2.1s" className="bottom-12 start-[-0.25rem] sm:bottom-16 sm:start-0">
            <Flame aria-hidden className="h-4 w-4 text-[#FF7A45]" />
            {t("home.v2.chips.streak") || "7-day streak"}
          </Chip>
          <Chip delay="0.6s" className="bottom-[0px] end-6 tracking-[0.2em] sm:end-10">
            🇰🇷🇯🇵🇪🇸
          </Chip>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
