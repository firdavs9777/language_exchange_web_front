import { SEO_PAGES } from "./pages";

/** Indexed pages; written to the sitemap. */
export const SITEMAP_PATHS: string[] = SEO_PAGES.map((p) => p.path);

/** Everything written to build/<path>/index.html. Dynamic routes never appear here. */
export const PRERENDER_PATHS: string[] = [...SITEMAP_PATHS, "/404"];
