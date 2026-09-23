import React from "react";
import { useTranslation } from "react-i18next";
import { SurfaceCard } from "../../../design";
import Reveal from "../anim/Reveal";

const STEPS = [
  {
    n: "1",
    title: "Tell us what you speak, and what you want",
    body: "Pick your native language and the one you're learning. That pair is how we match you.",
  },
  {
    n: "2",
    title: "Find someone worth talking to",
    body: "Browse partners learning your language. Wave, or just start a conversation.",
  },
  {
    n: "3",
    title: "Talk badly, improve fast",
    body: "Every message is translated both ways, and the AI tutor corrects you without anyone watching.",
  },
];

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="how-it-works" className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {t("home.howItWorks.title") || "How it works"}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const title = t(`home.howItWorks.steps.${s.n}.title`) || s.title;
            const body = t(`home.howItWorks.steps.${s.n}.body`) || s.body;
            return (
              <Reveal key={s.n} delayMs={i * 120}>
                <SurfaceCard padding="lg">
                <div data-testid="how-step">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/[0.12] text-sm font-extrabold text-brand-dark dark:text-brand-light">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-50">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>
                </div>
                </SurfaceCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
