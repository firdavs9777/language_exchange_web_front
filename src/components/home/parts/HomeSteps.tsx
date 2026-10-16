import React from "react";
import { useTranslation } from "react-i18next";
import { Globe2, MessageCircleHeart, Users } from "lucide-react";
import Reveal from "../anim/Reveal";

// Each step carries its own accent: teal, violet, coral -- the hero's palette,
// so the page reads as one system rather than a rainbow.
const STEPS = [
  {
    n: "1",
    Icon: Globe2,
    chip: "bg-[#E3F7F1] text-[#00806A] dark:bg-[#4DBFA8]/15 dark:text-[#7FE0CB]",
    title: "Pick your languages",
    body: "Tell us what you speak and what you want to learn.",
  },
  {
    n: "2",
    Icon: Users,
    chip: "bg-[#ECEBFF] text-[#5149E0] dark:bg-[#6C63FF]/20 dark:text-[#B5B0FF]",
    title: "Match with natives",
    body: "Meet people who speak your target language and want to learn yours.",
  },
  {
    n: "3",
    Icon: MessageCircleHeart,
    chip: "bg-[#FFEDEA] text-[#D94A3A] dark:bg-[#FF8A80]/15 dark:text-[#FFB3AB]",
    title: "Chat, call & learn",
    body: "Text, voice notes and calls, with translation and corrections built in.",
  },
];

const HomeSteps: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="home-steps" className="bg-[#fff] px-[1rem] py-16 sm:py-20 dark:bg-canvas-dark">
      <div className="mx-[auto] max-w-6xl [text-align:center]">
        <p className="bt-eyebrow text-brand-deep dark:text-brand-light">
          {t("home.v2.steps.eyebrow") || "How it works"}
        </p>
        <h2 className="mt-[0.75rem] font-display text-display-sm font-extrabold text-[#1B1B2F] sm:text-display-md dark:text-white">
          {t("home.v2.steps.title") || "Start talking in three steps"}
        </h2>

        <div className="mt-10 grid gap-[1.25rem] [text-align:start] sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delayMs={i * 110} className="h-full">
              <div
                data-testid="home-step"
                className="relative h-full rounded-[24px] border-[1px] border-line bg-[#fff] p-6 shadow-lift dark:border-line-dark dark:bg-cardbg-dark"
              >
                <div className="flex items-center gap-[0.75rem]">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${s.chip}`}>
                    <s.Icon aria-hidden className="h-6 w-6" />
                  </span>
                  <span className="font-display text-sm font-extrabold text-ink-400">0{s.n}</span>
                </div>
                <h3 className="mt-[1rem] font-display text-lg font-bold text-[#1B1B2F] dark:text-white">
                  {t(`home.v2.steps.s${s.n}.title`) || s.title}
                </h3>
                <p className="mt-[0.25rem].5 text-sm leading-relaxed text-ink-600 dark:text-gray-300">
                  {t(`home.v2.steps.s${s.n}.body`) || s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <a
          href="/register"
          data-testid="steps-cta"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-brand-deep px-7 py-3.5 text-sm font-bold text-[#fff] shadow-brand transition-transform hover:text-white motion-safe:hover:-translate-y-0.5"
        >
          {t("home.v2.steps.cta") || "Get started free"}
        </a>
      </div>
    </section>
  );
};

export default HomeSteps;
