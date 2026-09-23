import { APP_STORE_URL, PLAY_STORE_URL } from "../components/growth/storeUrls";
import { englishFallback } from "./i18nFallback";

export const SITE_ORIGIN = "https://banatalk.com";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export interface SeoContext {
  url: string;
}

export interface SeoPage {
  /** Route path without trailing slash; "/" for the homepage. */
  path: string;
  /** i18n keys; English lives in eng.json and is the fallback everywhere. */
  titleKey: string;
  descriptionKey: string;
  /** The phrase the title (and the page's h1) targets. Asserted by test, never rendered. */
  primary: string;
  /** Supporting phrases for body copy. Documentation for the copywriter. */
  secondary: string[];
  jsonLd?: (ctx: SeoContext) => object | object[];
  ogImage?: string;
  /**
   * English title/description for an entry whose keys are not in the locale
   * files yet. New pages ship their copy here and the locale pass (task B7)
   * merges the keys into all 18 files; `seoTitleEn` prefers eng.json the
   * moment they land, so these become a harmless safety net rather than a
   * second source of truth.
   */
  titleEn?: string;
  descriptionEn?: string;
}

// The keyword map. One entry per indexed route. Phase B adds /meet,
// /learn-korean and /communities here and nowhere else: RouteMeta, the
// prerender list and the sitemap all derive from this array.
export const SEO_PAGES: SeoPage[] = [
  {
    path: "/",
    titleKey: "seo.home.title",
    descriptionKey: "seo.home.description",
    primary: "language exchange app",
    secondary: ["practice speaking with native speakers", "free language exchange", "chat with native speakers"],
  },
  {
    path: "/download",
    titleKey: "seo.download.title",
    descriptionKey: "seo.download.description",
    primary: "download bananatalk",
    secondary: ["language exchange app for iphone", "language exchange app for android"],
    // The store URLs come from StoreLink, the one file allowed to spell them
    // (storeUrls.test.ts), and without a campaign: this is the app's identity
    // for a search engine, not a tap we want to attribute.
    jsonLd: (ctx) => ({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "BananaTalk",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "iOS, Android",
      url: ctx.url,
      sameAs: [APP_STORE_URL, PLAY_STORE_URL],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free, VIP from $9.99",
      },
    }),
  },
  {
    path: "/meet",
    titleKey: "seo.meet.title",
    descriptionKey: "seo.meet.description",
    primary: "meet people from other countries",
    secondary: ["international friends app", "make friends from other countries", "language exchange partners"],
    titleEn: "Meet People From Other Countries | BananaTalk",
    descriptionEn:
      "Meet people from other countries and make international friends by chatting. Every message is translated both ways, so neither of you has to be fluent.",
  },
  {
    path: "/learn-korean",
    titleKey: "seo.learnKorean.title",
    descriptionKey: "seo.learnKorean.description",
    primary: "learn Korean by chatting",
    secondary: ["talk to Korean native speakers", "Korean language exchange", "practise Korean online"],
    titleEn: "Learn Korean by Chatting With Native Speakers",
    descriptionEn:
      "Learn Korean by chatting with native Korean speakers for free. You write English, they write Hangul, and an AI tutor explains 존댓말 vs 반말 as you go.",
  },
  {
    path: "/communities",
    titleKey: "seo.communities.title",
    descriptionKey: "seo.communities.description",
    primary: "language exchange communities",
    secondary: ["language exchange groups", "practice a language with a group", "find a language partner group"],
    titleEn: "Language Exchange Communities | BananaTalk",
    descriptionEn:
      "Join language exchange communities on BananaTalk: real groups practising Korean, Spanish, Japanese and more together, free, every day.",
  },
  {
    path: "/moments",
    titleKey: "seo.moments.title",
    descriptionKey: "seo.moments.description",
    primary: "moments",
    secondary: ["language learning stories", "post in your target language"],
  },
  { path: "/privacy-policy", titleKey: "seo.privacy.title", descriptionKey: "seo.privacy.description", primary: "privacy policy", secondary: [] },
  { path: "/terms-of-use", titleKey: "seo.terms.title", descriptionKey: "seo.terms.description", primary: "terms of use", secondary: [] },
  { path: "/support", titleKey: "seo.support.title", descriptionKey: "seo.support.description", primary: "support", secondary: ["contact bananatalk"] },
  { path: "/data-deletion", titleKey: "seo.dataDeletion.title", descriptionKey: "seo.dataDeletion.description", primary: "data deletion", secondary: [] },
];

/** The English title: from eng.json when the key is there, else the entry's own. */
export function seoTitleEn(page: SeoPage): string {
  return englishFallback(page.titleKey) || page.titleEn || "";
}

/** The English description, resolved the same way. */
export function seoDescriptionEn(page: SeoPage): string {
  return englishFallback(page.descriptionKey) || page.descriptionEn || "";
}

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function findSeoPage(pathname: string): SeoPage | undefined {
  const p = normalizePath(pathname);
  return SEO_PAGES.find((page) => page.path === p);
}

export function canonicalUrl(path: string): string {
  return path === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${path}`;
}
