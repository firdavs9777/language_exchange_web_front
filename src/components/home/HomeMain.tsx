import React from "react";
import { useTranslation } from "react-i18next";
import HomeHero from "./parts/HomeHero";
import HomeSteps from "./parts/HomeSteps";
import HomeFeatures from "./parts/HomeFeatures";
import LanguageMarquee from "./parts/LanguageMarquee";
import StatStrip from "./parts/StatStrip";
import PricingSection from "./parts/PricingSection";
import HomeCta from "./parts/HomeCta";
import AppDownloadPopup from "../growth/AppDownloadPopup";
import StickyAppBanner from "../growth/StickyAppBanner";
import AdUnit from "../ads/AdUnit";
import { AD_SLOTS } from "../ads/adsenseConfig";

// The homepage is an ordering of sections and nothing else; every section owns
// its markup, copy and tests. The argument, in order: sell it in one screen
// (hero), make it feel easy (three steps), show the benefits with the real
// app, prove the reach (languages, live stats), name the price, ask for the
// install. Every section ends in a call to action.
//
// The AdUnit keeps its place after the features (commit 1ff24d4). It renders
// nothing unless ads are configured. Pricing keeps id="pricing" because the
// footer links to /#pricing.
const HomeMain: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-[#fff] dark:bg-canvas-dark">
      <HomeHero />
      <HomeSteps />
      <HomeFeatures />
      <AdUnit slot={AD_SLOTS.home} className="my-6" />
      <div className="bg-[#fff] pt-6 dark:bg-canvas-dark">
        <LanguageMarquee />
        <div className="[text-align:center]">
          <a
            href="/register"
            data-testid="languages-cta"
            className="inline-flex items-center justify-center rounded-full border-[2px] border-brand px-6 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:bg-brand hover:text-white dark:text-brand-light dark:hover:text-white"
          >
            {t("home.v2.languages.cta") || "Find a language partner"}
          </a>
        </div>
      </div>
      <StatStrip />
      <div id="pricing">
        <PricingSection />
      </div>
      <HomeCta />
      <AppDownloadPopup />
      <StickyAppBanner />
    </div>
  );
};

export default HomeMain;
