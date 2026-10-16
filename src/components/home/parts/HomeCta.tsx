import React from "react";
import { useTranslation } from "react-i18next";
import StoreButtons from "./StoreButtons";

// The closing band: mint-to-teal like the app's splash, deepened at the end
// stop so white display type stays readable (large text, AA-large).
const HomeCta: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="home-cta" className="px-[1rem] py-16 sm:py-20">
      <div className="relative mx-[auto] max-w-6xl overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3FB39C] via-[#00967F] to-[#006E5C] px-6 py-14 [text-align:center] shadow-glass sm:px-12 sm:py-16">
        <span aria-hidden className="pointer-events-none absolute -start-16 -top-16 h-56 w-56 rounded-full bg-[#FFD93D] opacity-30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -end-10 h-64 w-64 rounded-full bg-[#6C63FF] opacity-30 blur-3xl" />
        <div className="relative">
          <h2 className="mx-[auto] max-w-2xl font-display text-display-sm font-extrabold text-[#fff] sm:text-display-lg">
            {t("home.v2.cta.title") || "Your first conversation is one tap away"}
          </h2>
          <p className="mx-[auto] mt-[0.75rem] max-w-lg text-base font-medium text-white/90">
            {t("home.v2.cta.subtitle") || "Free to download, free to start. Someone is learning your language right now."}
          </p>
          <StoreButtons placement="final-cta" tone="light" className="mt-8 justify-center" />
          <a
            href="/register"
            className="mt-[1.25rem] inline-block text-sm font-bold text-[#fff] underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
          >
            {t("home.v2.cta.web") || "Or use BananaTalk on the web"}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HomeCta;
