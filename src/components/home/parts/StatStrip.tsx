import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "../anim/Reveal";
import { useInView } from "../anim/useInView";
import { useCountUp } from "../anim/useCountUp";

// Every figure here is checkable. No member count: /api/v1/auth/users/count is
// behind `protect` (routes/users.js:63), so a logged-out visitor cannot read
// it. No ratings: the App Store listing has none.
// "18 app languages" -- src/utils/locales/ holds 18 JSON files and
// `SUPPORTED_LANGUAGES` in src/utils/i18n.ts lists 18 codes; re-count either
// to re-verify.
const STATS = [
  { value: "137", label: "languages" },
  { value: "18", label: "app languages" },
  { value: "24/7", label: "AI tutor" },
  { value: "Free", label: "forever tier" },
];

/** Numeric stats tick up when the strip scrolls into view; the rest are literal. */
const StatValue: React.FC<{ value: string; start: boolean }> = ({ value, start }) => {
  const numeric = /^\d+$/.test(value) ? Number(value) : null;
  const counted = useCountUp(numeric ?? 0, { start: start && numeric !== null });
  return (
    <p className="text-2xl font-extrabold text-brand-dark dark:text-brand-light">
      {numeric === null ? value : counted}
    </p>
  );
};

const StatStrip: React.FC = () => {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      data-testid="stat-strip"
      className="border-y border-gray-100 bg-surface py-8 dark:border-gray-700 dark:bg-cardbg-dark"
    >
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delayMs={i * 90}>
            <div data-testid="stat-item" className="text-center">
              <StatValue value={s.value} start={inView} />
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {t(`home.stats.${s.label}`) || s.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default StatStrip;
