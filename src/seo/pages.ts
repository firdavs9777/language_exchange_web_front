import { APP_STORE_URL, PLAY_STORE_URL } from "../components/growth/storeUrls";

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
