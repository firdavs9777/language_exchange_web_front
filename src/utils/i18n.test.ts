// The 17 non-English locales are webpack chunks now (task D1): only
// eng.json is inlined in the entrypoint, everything else arrives through
// src/utils/i18nLazyBackend.ts the first time someone asks for it.
//
// What has to stay true across that change:
//   - the loader map covers every supported language except the inlined one,
//     and each loader really resolves the right file (ko -> kor.json, ...);
//   - `changeLanguage` still resolves *after* the bundle is in the store, so
//     `t()` never returns a raw key or an empty string in between -- the
//     English fallback holds until the switch completes (no flash);
//   - a language we do not ship falls through to English rather than erroring.
import i18n, { SUPPORTED_LANGUAGES } from "./i18n";
import lazyBackend, { LOCALE_LOADERS } from "./i18nLazyBackend";
import {
  prepareForHydration,
  restoreAfterHydration,
  _resetHydrationLanguageForTests,
} from "./hydrationLanguage";

const EN_HERO = "Say it badly.";
const KO_HERO = "서툴러도 괜찮아요.";
const JA_HERO = "下手でいい。";

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
});

afterEach(() => {
  _resetHydrationLanguageForTests();
});

it("has a loader for exactly the supported languages that are not inlined", () => {
  const expected = SUPPORTED_LANGUAGES.filter((l) => l !== "en")
    .slice()
    .sort();
  expect(Object.keys(LOCALE_LOADERS).sort()).toEqual(expected);
});

it("keeps English in the entrypoint and nothing else", () => {
  // `resources` is the inlined half of the split. If a second language shows
  // up here, ~18 KB gzipped went back into main.js with it.
  expect(Object.keys(i18n.options.resources || {})).toEqual(["en"]);
  expect(i18n.options.partialBundledLanguages).toBe(true);
});

it("resolves every loader to a real translation bundle", async () => {
  const codes = Object.keys(LOCALE_LOADERS);
  const loaded = await Promise.all(codes.map((c) => LOCALE_LOADERS[c]()));
  loaded.forEach((mod, i) => {
    const data: any = (mod as any).default || mod;
    expect(typeof data).toBe("object");
    // Every locale carries the marketing hero, so this is a file-mapping
    // check as much as a shape check: ko must land on kor.json, zh on zho.json.
    expect(typeof data.home.hero.title).toBe("string");
    expect(data.home.hero.title.length).toBeGreaterThan(0);
    if (codes[i] === "ko") expect(data.home.hero.title).toBe(KO_HERO);
  });
});

it("serves English from t() until the Korean bundle has loaded, then Korean", async () => {
  await i18n.changeLanguage("en");
  expect(i18n.t("home.hero.title")).toBe(EN_HERO);

  // The first switch to Korean is the one that really fetches a chunk: no
  // test above has put kor.json into the i18next store.
  expect(i18n.hasResourceBundle("ko", "translation")).toBe(false);
  const pending = i18n.changeLanguage("ko");
  // i18next loads the bundle before it switches, so the old language is still
  // in force here -- not a key, not "" from parseMissingKeyHandler.
  expect(i18n.t("home.hero.title")).toBe(EN_HERO);

  await pending;
  expect(i18n.t("home.hero.title")).toBe(KO_HERO);
  expect(i18n.language).toBe("ko");
});

it("updates <html lang> once the switch resolves", async () => {
  await i18n.changeLanguage("zh_TW");
  expect(document.documentElement.lang).toBe("zh-TW");
  await i18n.changeLanguage("en");
  expect(document.documentElement.lang).toBe("en");
});

it("falls back to English for a language we do not ship", async () => {
  await i18n.changeLanguage("xx");
  expect(i18n.t("home.hero.title")).toBe(EN_HERO);
});

it("reads an unknown language as an empty bundle rather than an error", (done) => {
  lazyBackend.read("xx", "translation", (err: any, data: any) => {
    expect(err).toBe(null);
    expect(data).toEqual({});
    done();
  });
});

it("restores the visitor's language after hydration", async () => {
  // The no-flash half of this contract is asserted above, on the switch that
  // really does have to fetch a chunk. Here the bundle is already in the store
  // from the earlier tests, so i18next switches without a round trip -- which
  // is also what a repeat visitor gets. Either way the assertion that matters
  // is the same: t() is English before, the visitor's language after, and
  // never a raw key or the "" that parseMissingKeyHandler returns.
  await i18n.changeLanguage("ja");
  expect(prepareForHydration(i18n)).toBe("ja");
  expect(i18n.language).toBe("en");
  expect(i18n.t("home.hero.title")).toBe(EN_HERO);

  restoreAfterHydration(i18n);
  if (i18n.language !== "ja") {
    await new Promise<void>((resolve) => i18n.on("languageChanged", () => resolve()));
  }
  expect(i18n.language).toBe("ja");
  expect(i18n.t("home.hero.title")).toBe(JA_HERO);
  await i18n.changeLanguage("en");
});
