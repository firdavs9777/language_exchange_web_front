import { matchRoutes } from "react-router-dom";
import en from "../utils/locales/eng.json";
import { routes } from "../router/routes";
import { SEO_PAGES, findSeoPage, canonicalUrl, normalizePath } from "./pages";
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

  it("normalizes trailing slashes and builds canonical URLs", () => {
    expect(normalizePath("/privacy-policy/")).toBe("/privacy-policy");
    expect(normalizePath("/")).toBe("/");
    expect(findSeoPage("/privacy-policy/")!.path).toBe("/privacy-policy");
    expect(findSeoPage("/chat")).toBeUndefined();
    expect(canonicalUrl("/")).toBe("https://banatalk.com");
    expect(canonicalUrl("/download")).toBe("https://banatalk.com/download");
  });
});
