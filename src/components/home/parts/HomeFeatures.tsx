import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Clapperboard, GraduationCap, MessagesSquare, UsersRound } from "lucide-react";
import Reveal from "../anim/Reveal";
import PhoneFrame, { AppShot } from "./PhoneFrame";

interface Feature {
  key: "chat" | "study" | "moments" | "community";
  shot: AppShot;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Icon chip + bullet ticks. */
  chip: string;
  tick: string;
  /** The coloured stage the phone stands on. */
  stage: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: [string, string, string];
  alt: string;
}

// Headline = the benefit; the eyebrow names the feature. One accent per row:
// teal for chat (the core), violet for study (the app's Study Hub purple),
// coral for moments, yellow for community (the logo's yellow).
const FEATURES: Feature[] = [
  {
    key: "chat",
    shot: "app-chat",
    Icon: MessagesSquare,
    chip: "bg-[#E3F7F1] text-[#00806A] dark:bg-[#4DBFA8]/15 dark:text-[#7FE0CB]",
    tick: "text-[#00A88E] dark:text-[#7FE0CB]",
    stage: "from-[#D9F6EE] to-[#9FE3D2] dark:from-[#123430] dark:to-[#0E2522]",
    eyebrow: "Chat with native speakers",
    title: "Make friends who speak the language you want",
    body: "Text, voice notes and calls with natives, with help the moment you get stuck.",
    bullets: ["Instant translation", "Gentle corrections", "Voice notes & calls"],
    alt: "A BananaTalk chat with translation tools",
  },
  {
    key: "study",
    shot: "app-study",
    Icon: GraduationCap,
    chip: "bg-[#ECEBFF] text-[#5149E0] dark:bg-[#6C63FF]/20 dark:text-[#B5B0FF]",
    tick: "text-[#6C63FF] dark:text-[#B5B0FF]",
    stage: "from-[#E7E5FF] to-[#BDB8FF] dark:from-[#1E1B3D] dark:to-[#15132B]",
    eyebrow: "AI Study",
    title: "Practise a little every day, without the boredom",
    body: "A fresh daily pack and an AI tutor that adapts to your level.",
    bullets: ["Daily lessons in minutes", "AI tutor, 24/7", "Streaks and XP"],
    alt: "BananaTalk Study Hub with a daily lesson, XP and streak",
  },
  {
    key: "moments",
    shot: "app-moments",
    Icon: Clapperboard,
    chip: "bg-[#FFEDEA] text-[#D94A3A] dark:bg-[#FF8A80]/15 dark:text-[#FFB3AB]",
    tick: "text-[#F2675A] dark:text-[#FFB3AB]",
    stage: "from-[#FFE7E3] to-[#FFC2B9] dark:from-[#3A1E1C] dark:to-[#2A1716]",
    eyebrow: "Moments & Reels",
    title: "Learn how people really talk",
    body: "Share posts and short videos, and see everyday language from natives.",
    bullets: ["Posts & stories", "Short language reels", "One-tap translate"],
    alt: "The BananaTalk Moments feed",
  },
  {
    key: "community",
    shot: "app-community",
    Icon: UsersRound,
    chip: "bg-[#FFF6CC] text-[#8A6D00] dark:bg-[#FFD93D]/15 dark:text-[#FFE680]",
    tick: "text-[#E0A800] dark:text-[#FFE680]",
    stage: "from-[#FFF5C7] to-[#FFE27A] dark:from-[#352E12] dark:to-[#26210D]",
    eyebrow: "Community",
    title: "Find your people, anywhere in the world",
    body: "Browse matches, drop into voice rooms and join gatherings near you.",
    bullets: ["Smart partner matches", "Live voice rooms", "Local gatherings"],
    alt: "BananaTalk community list of language partners",
  },
];

const HomeFeatures: React.FC = () => {
  const { t } = useTranslation();
  const k = (f: Feature, field: string) => `home.v2.features.${f.key}.${field}`;

  return (
    // id="features" is the navbar's "Features" target (/#features), from any page.
    <section
      id="features"
      data-testid="home-features"
      className="scroll-mt-20 bg-canvas px-[1rem] py-16 sm:py-24 dark:bg-[#0F1417]"
    >
      <div className="mx-[auto] max-w-6xl">
        <div className="[text-align:center]">
          <p className="bt-eyebrow text-brand-deep dark:text-brand-light">
            {t("home.v2.features.eyebrow") || "Why BananaTalk"}
          </p>
          <h2 className="mx-[auto] mt-[0.75rem] max-w-2xl font-display text-display-sm font-extrabold text-[#1B1B2F] sm:text-display-md dark:text-white">
            {t("home.v2.features.title") || "Everything you need to actually speak"}
          </h2>
        </div>

        <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-24">
          {FEATURES.map((f, i) => (
            <Reveal key={f.key}>
              <article
                data-testid="home-feature"
                className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
              >
                <div
                  className={`relative flex justify-center overflow-hidden rounded-[28px] bg-gradient-to-br px-6 pt-8 ${f.stage} ${
                    i % 2 === 1 ? "md:order-2" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl dark:bg-white/5"
                  />
                  {/* Cropped at the bottom edge of the stage: the top of the
                      screen is what carries the feature. */}
                  <div className="relative h-[19rem] w-[13rem] overflow-hidden sm:h-[23rem] sm:w-[15.5rem]">
                    <PhoneFrame shot={f.shot} alt={t(k(f, "alt")) || f.alt} className="relative" />
                  </div>
                </div>

                <div className="[text-align:start]">
                  <div className="flex items-center gap-[0.75rem]">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.chip}`}>
                      <f.Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-ink-600 dark:text-gray-300">
                      {t(k(f, "eyebrow")) || f.eyebrow}
                    </span>
                  </div>
                  <h3 className="mt-[1rem] font-display text-2xl font-extrabold leading-tight tracking-tight text-[#1B1B2F] sm:text-display-sm dark:text-white">
                    {t(k(f, "title")) || f.title}
                  </h3>
                  <p className="mt-[0.75rem] text-base leading-relaxed text-ink-600 dark:text-gray-300">
                    {t(k(f, "body")) || f.body}
                  </p>
                  <ul className="mt-[1.25rem] space-y-2.5 ps-[0px]">
                    {f.bullets.map((b, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm font-semibold text-ink-800 dark:text-gray-100">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff] shadow-card dark:bg-white/10">
                          <Check aria-hidden className={`h-3.5 w-3.5 ${f.tick}`} />
                        </span>
                        {t(k(f, `b${j + 1}`)) || b}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 [text-align:center]">
          <a
            href="/register"
            data-testid="features-cta"
            className="inline-flex items-center justify-center rounded-full bg-[#1B1B2F] px-7 py-3.5 text-sm font-bold text-[#fff] shadow-lift transition-transform hover:text-white motion-safe:hover:-translate-y-0.5 dark:bg-white dark:text-[#1B1B2F] dark:hover:text-[#1B1B2F]"
          >
            {t("home.v2.features.cta") || "Create your free account"}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatures;
