import fs from "fs";
import path from "path";

// Namespaces introduced by the reach work. Every locale must carry exactly the
// English key set, so a missing translation is a failing test rather than a
// silent fallback. Later tasks append to this list.
const NAMESPACES = ["seo", "notFound", "consent", "admin", "moments_section", "home", "download", "meet", "learnKorean", "communities", "errors", "growth", "profile", "editMoment", "communityMain", "communityDetail", "chatPage", "newChat", "topics", "stories"];

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const flatten = (o: any, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

// i18next plural keys (`foo_one`, `foo_other`, and, for languages whose CLDR
// rule needs them, `foo_zero` / `foo_two` / `foo_few` / `foo_many`) are all
// the same logical string in different locales: English only ever needs
// `one`/`other`, but Russian needs `one`/`few`/`many`/`other` and Arabic needs
// still more. Comparing the raw flattened keys would fail every locale that
// legitimately carries more plural categories than English does, so parity
// is checked on the base key (the plural suffix stripped) instead -- that
// still catches a genuinely missing or misspelled translation.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (k: string) => k.replace(PLURAL_SUFFIX, "");
const baseKeySet = (keys: string[]) => Array.from(new Set(keys.map(baseKey))).sort();

const en = read("eng.json");

describe.each(NAMESPACES)("locale parity: %s", (ns) => {
  const expected = baseKeySet(flatten(en[ns] || {}));

  it("exists in English", () => {
    expect(expected.length).toBeGreaterThan(0);
  });

  it.each(files)("%s carries the same keys as English", (file) => {
    const value = read(file)[ns];
    expect(value ? baseKeySet(flatten(value)) : null).toEqual(expected);
  });

  it("has 18 locale files", () => {
    expect(files.length).toBe(18);
  });
});
