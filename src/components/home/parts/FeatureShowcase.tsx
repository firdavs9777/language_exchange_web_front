import React from "react";
import { useTranslation } from "react-i18next";
import { SurfaceCard, Badge } from "../../../design";
import Reveal from "../anim/Reveal";

// `appOnly` drives the "In the app" badge. It is the honest form of an upsell:
// it says what installing gets you rather than implying the web has it all.
const FEATURES = [
  { icon: "🌏", title: "Find a partner", body: "Match on the language pair you actually want to trade.", appOnly: false },
  { icon: "💬", title: "Chat that translates", body: "Both directions, in the message, as you type.", appOnly: false },
  { icon: "📸", title: "Moments", body: "Share what your day looks like; get corrected by natives.", appOnly: false },
  { icon: "✦", title: "AI tutor", body: "Practise at 3am without embarrassing yourself.", appOnly: true },
  { icon: "🎙️", title: "Voice rooms", body: "Drop into a live room and just listen, if you like.", appOnly: true },
  { icon: "📍", title: "Gatherings", body: "Meet people learning your language nearby.", appOnly: true },
];

const FeatureShowcase: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="feature-showcase" className="px-4 py-16 bg-canvas dark:bg-canvas-dark">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {t("home.features.title") || "Everything you need to actually practise"}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={(i % 3) * 110}>
              <SurfaceCard
                padding="lg"
                className="h-full transition-transform duration-300 motion-safe:hover:-translate-y-1"
              >
              <div data-testid="feature-card">
                <span aria-hidden className="text-2xl">{f.icon}</span>
                <div className="mt-2 flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">{f.title}</h3>
                  {f.appOnly && (
                    <span data-testid="feature-mobile-only">
                      <Badge tone="banana">In the app</Badge>
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{f.body}</p>
              </div>
              </SurfaceCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
