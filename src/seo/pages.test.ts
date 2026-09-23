import { matchRoutes } from "react-router-dom";
import en from "../utils/locales/eng.json";
import { routes } from "../router/routes";
import { SEO_PAGES, findSeoPage, canonicalUrl, normalizePath } from "./pages";
import { APP_STORE_URL, PLAY_STORE_URL } from "../components/growth/StoreLink";
import { getByPath } from "./i18nFallback";

describe("SEO map", () => {
  it("every entry is a real route", () => {
    for (const page of SEO_PAGES) {
      const matches = matchRoutes(routes, page.path);
      expect(matches && matches.length).toBe(2);
      expect(matches![1].route.path).not.toBe("*");
    }
  });

  it("titles fit a result line and descriptions fit a snippet", () => {
    for (const page of SEO_PAGES) {
      const title = getByPath(en, page.titleKey);
      const description = getByPath(en, page.descriptionKey);
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(description.length).toBeGreaterThan(0);
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });

  it("no two pages share a title", () => {
    const titles = SEO_PAGES.map((p) => getByPath(en, p.titleKey));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("each title carries the phrase it targets", () => {
    for (const page of SEO_PAGES) {
      expect(getByPath(en, page.titleKey).toLowerCase()).toContain(page.primary.toLowerCase());
    }
  });

  // The download page is the one entry a rich result can act on: the card
  // Google draws for an app needs both store links and a price.
  it("describes the app on /download, with both stores and the real price", () => {
    const page = findSeoPage("/download")!;
    expect(page.jsonLd).toBeDefined();
    const ld = page.jsonLd!({ url: canonicalUrl("/download") }) as any;
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.url).toBe("https://banatalk.com/download");
    expect(ld.sameAs).toEqual([APP_STORE_URL, PLAY_STORE_URL]);
    expect(ld.operatingSystem).toContain("iOS");
    expect(ld.operatingSystem).toContain("Android");
    expect(ld.offers.price).toBe("0");
    expect(ld.offers.description).toBe("Free, VIP from $9.99");
    expect(() => JSON.stringify(ld)).not.toThrow();
  });

  it("normalizes trailing slashes and builds canonical URLs", () => {
    expect(normalizePath("/privacy-policy/")).toBe("/privacy-policy");
    expect(normalizePath("/")).toBe("/");
    expect(findSeoPage("/privacy-policy/")!.path).toBe("/privacy-policy");
    expect(findSeoPage("/chat")).toBeUndefined();
    expect(canonicalUrl("/")).toBe("https://banatalk.com");
    expect(canonicalUrl("/download")).toBe("https://banatalk.com/download");
  });
});
