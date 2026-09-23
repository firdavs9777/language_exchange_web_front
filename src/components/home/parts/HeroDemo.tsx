import React from "react";
import { useTranslation } from "react-i18next";
import { languageFlag } from "../../../utils/languages";
import { MARQUEE_LANGUAGES } from "../../../data/marqueeLanguages";
import StoreLink from "../../growth/StoreLink";

// The 14s hero cycle, as slot offsets. One set of keyframes (tailwind.config.js)
// serves all three bubbles; the delay is what makes it a conversation. A JS
// timer would be the obvious alternative and the wrong one: this page is
// prerendered with renderToString and hydrated, so anything that moved with
// state would either change the server markup or desync on the first paint.
const SLOT_MS = { first: 0, reply: 2800, tutor: 5600 };
const TRANSLATION_OFFSET_MS = 700;

// Eight flags from the head of the marquee's curated list, drifting behind the
// hero. Fixed table rather than Math.random(): a random position would differ
// between the prerendered HTML and the first client render.
const HERO_FLAGS = [
  { left: "4%", top: "14%", delay: "0s", duration: "22s" },
  { left: "17%", top: "70%", delay: "3.5s", duration: "27s" },
  { left: "29%", top: "6%", delay: "1.2s", duration: "19s" },
  { left: "41%", top: "84%", delay: "5s", duration: "30s" },
  { left: "57%", top: "18%", delay: "2.1s", duration: "24s" },
  { left: "69%", top: "76%", delay: "6.4s", duration: "18s" },
  { left: "83%", top: "28%", delay: "4.2s", duration: "28s" },
  { left: "93%", top: "60%", delay: "7.8s", duration: "21s" },
];

// An opaque overlay, not a decoration: bg-inherit takes the bubble's own
// background (either theme), so while it is up the bubble reads as empty and
// the text behind it looks typed rather than merely faded in. It clears at
// 8.5% of the cycle and never returns until the cycle restarts.
//
// motion-reduce:hidden because reduced motion runs no keyframes at all: the
// overlay would otherwise sit over the text forever.
const TypingDots: React.FC<{ delayMs: number; dotClassName: string }> = ({
  delayMs,
  dotClassName,
}) => (
  <span
    aria-hidden
    data-testid="demo-typing"
    style={{ animationDelay: `${delayMs}ms` }}
    className="absolute inset-0 z-10 flex items-center gap-1.5 rounded-card bg-inherit p-3 motion-safe:animate-bt-type-dots motion-reduce:hidden"
  >
    {[0, 160, 320].map((stagger) => (
      <span
        key={stagger}
        style={{ animationDelay: `${stagger}ms` }}
        className={`h-2 w-2 rounded-full motion-safe:animate-pulse ${dotClassName}`}
      />
    ))}
  </span>
);

const HeroDemo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      data-testid="hero-demo"
      className="relative overflow-hidden px-4 py-14 sm:py-20 bg-gradient-to-b from-white to-canvas dark:from-canvas-dark dark:to-canvas-dark"
    >
      <div
        aria-hidden
        data-testid="hero-flags"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        {HERO_FLAGS.map((flag, i) => (
          <span
            key={MARQUEE_LANGUAGES[i]}
            style={{
              left: flag.left,
              top: flag.top,
              animationDelay: flag.delay,
              animationDuration: flag.duration,
            }}
            className="absolute text-2xl opacity-[0.16] sm:text-3xl motion-safe:animate-bt-drift dark:opacity-[0.12]"
          >
            {languageFlag(MARQUEE_LANGUAGES[i])}
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
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
            <StoreLink
              store="ios"
              placement="hero"
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            />
            <StoreLink
              store="android"
              placement="hero"
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white"
            />
          </div>

          <p className="mt-5 text-xs font-medium text-gray-400">
            {t("home.hero.trust") || "Free forever tier · 137 languages · AI tutor 24/7"}
          </p>
        </div>

        {/* The mechanic, shown rather than claimed -- and now played out. */}
        <div className="rounded-card bg-gradient-to-br from-brand/[0.08] to-banana/[0.14] p-5 motion-safe:animate-bt-float">
          <div className="flex flex-col gap-3">
            <div
              data-testid="demo-message"
              style={{ animationDelay: `${SLOT_MS.first}ms` }}
              className="relative max-w-[86%] self-start rounded-card bg-surface p-3 shadow-card motion-safe:animate-bt-msg-in dark:bg-cardbg-dark"
            >
              <TypingDots delayMs={SLOT_MS.first} dotClassName="bg-gray-400" />
              <p className="text-sm text-gray-900 dark:text-gray-50">안녕하세요! 오늘 시간 있어요?</p>
              <p
                style={{ animationDelay: `${SLOT_MS.first + TRANSLATION_OFFSET_MS}ms` }}
                className="mt-1.5 overflow-hidden border-t border-dashed border-gray-200 pt-1.5 text-xs text-brand motion-safe:animate-bt-line-in dark:border-gray-600"
              >
                Hi! Do you have time today?
              </p>
            </div>

            <div
              data-testid="demo-message"
              style={{ animationDelay: `${SLOT_MS.reply}ms` }}
              className="relative max-w-[86%] self-end rounded-card bg-brand p-3 text-white shadow-card motion-safe:animate-bt-msg-in"
            >
              <TypingDots delayMs={SLOT_MS.reply} dotClassName="bg-white/70" />
              <p className="text-sm">Yes! I want practice Korean 😅</p>
              <p
                style={{ animationDelay: `${SLOT_MS.reply + TRANSLATION_OFFSET_MS}ms` }}
                className="mt-1.5 overflow-hidden border-t border-dashed border-white/40 pt-1.5 text-xs opacity-90 motion-safe:animate-bt-line-in"
              >
                네! 한국어 연습하고 싶어요
              </p>
            </div>

            <div
              data-testid="demo-tutor-note"
              style={{ animationDelay: `${SLOT_MS.tutor}ms` }}
              className="relative max-w-[94%] self-start rounded-card border-2 border-banana bg-surface p-3 shadow-card motion-safe:animate-bt-msg-in dark:bg-cardbg-dark"
            >
              <TypingDots delayMs={SLOT_MS.tutor} dotClassName="bg-banana-dark" />
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
