import React from "react";
import { useTranslation } from "react-i18next";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/bananatalk-learn-meet-or-date/id6755862146";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bananatalk.app";

const FinalCta: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section data-testid="final-cta" className="bg-brand px-4 py-16 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-white">
        {t("home.cta.title") || "Someone is learning your language right now"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/[0.9]">
        {t("home.cta.subtitle") || "Free to start. No card, no trial countdown."}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
           className="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-brand-dark">
          App Store
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
           className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-extrabold text-white">
          Google Play
        </a>
      </div>
    </section>
  );
};

export default FinalCta;
