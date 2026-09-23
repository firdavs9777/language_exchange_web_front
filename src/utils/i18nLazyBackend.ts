// src/utils/i18nLazyBackend.ts
//
// English is inlined in src/utils/i18n.ts's `resources`; the other 17 locales
// are `import()`ed, so webpack emits one chunk per language and a first-time
// visitor downloads only the one they actually read. Before this, all 18 JSON
// files were static imports -- ~306 KB gzipped of the 552 KB entrypoint, paid
// by every visitor on every marketing page for 17 languages they cannot read.
//
// i18next reaches a lazy resource through a *backend* plugin, so this is one:
// the smallest object that satisfies `BackendModule` -- no HTTP, no cache, no
// reload timer (the http backend's hourly interval was an open handle in Node).
// `partialBundledLanguages: true` in i18n.ts is what makes i18next consult a
// backend at all when `resources` is already present.
//
// The loaders are spelled out one by one on purpose. A computed
// `import(\`./locales/${file}.json\`)` would make webpack bundle *every* JSON
// in that directory into one context chunk, which is the weight we are here to
// remove. The file names are the historical ones: ko -> kor, zh -> zho.
import { BackendModule, ReadCallback } from "i18next";

export type LocaleLoader = () => Promise<{ default: object } | object>;

export const LOCALE_LOADERS: Record<string, LocaleLoader> = {
  ko: () => import(/* webpackChunkName: "locale-ko" */ "./locales/kor.json"),
  zh: () => import(/* webpackChunkName: "locale-zh" */ "./locales/zho.json"),
  zh_TW: () => import(/* webpackChunkName: "locale-zh-TW" */ "./locales/zh_TW.json"),
  ar: () => import(/* webpackChunkName: "locale-ar" */ "./locales/ar.json"),
  de: () => import(/* webpackChunkName: "locale-de" */ "./locales/de.json"),
  es: () => import(/* webpackChunkName: "locale-es" */ "./locales/es.json"),
  fr: () => import(/* webpackChunkName: "locale-fr" */ "./locales/fr.json"),
  hi: () => import(/* webpackChunkName: "locale-hi" */ "./locales/hi.json"),
  id: () => import(/* webpackChunkName: "locale-id" */ "./locales/id.json"),
  it: () => import(/* webpackChunkName: "locale-it" */ "./locales/it.json"),
  ja: () => import(/* webpackChunkName: "locale-ja" */ "./locales/ja.json"),
  pt: () => import(/* webpackChunkName: "locale-pt" */ "./locales/pt.json"),
  ru: () => import(/* webpackChunkName: "locale-ru" */ "./locales/ru.json"),
  th: () => import(/* webpackChunkName: "locale-th" */ "./locales/th.json"),
  tl: () => import(/* webpackChunkName: "locale-tl" */ "./locales/tl.json"),
  tr: () => import(/* webpackChunkName: "locale-tr" */ "./locales/tr.json"),
  vi: () => import(/* webpackChunkName: "locale-vi" */ "./locales/vi.json"),
};

/**
 * i18next may hand back either spelling of a region code; accept both.
 *
 * Load-bearing since `load: "languageOnly"` was dropped: a browser reporting
 * `zh-TW` now reaches the backend with the region intact, and this is what
 * lands it on zh_TW.json rather than on the Simplified fallback behind it.
 */
const loaderFor = (lng: string): LocaleLoader | undefined =>
  LOCALE_LOADERS[lng] || LOCALE_LOADERS[lng.replace(/-/g, "_")];

const i18nLazyBackend: BackendModule = {
  type: "backend",
  init(): void {
    // Nothing to configure: the loaders are the whole backend.
  },
  read(language: string, _namespace: string, callback: ReadCallback): void {
    const loader = loaderFor(language);
    if (!loader) {
      // Not a language we ship. An empty bundle (rather than an error) lets
      // i18next mark the namespace loaded and fall through to English; an
      // error would make it retry and log on every render.
      callback(null, {});
      return;
    }
    loader().then(
      (mod) => callback(null, ((mod as any) && (mod as any).default) || mod),
      // `true`, not `false`, and the difference is load-bearing: i18next's
      // BackendConnector retries only when the callback's *data* argument is
      // truthy. With `false` it marks this lng|ns as -1 and skips it forever,
      // so one transient failure -- a chunk 404 after a mid-session deploy, a
      // tunnel, a blocked request -- would leave that language stuck on
      // English for the rest of the tab with no way back. With `true` it
      // retries five times with a doubling backoff and then settles at 0, so a
      // later user-initiated switch tries again (and webpack 5 does re-request
      // a chunk whose load rejected).
      (err) => callback(err, true)
    );
  },
};

export default i18nLazyBackend;
