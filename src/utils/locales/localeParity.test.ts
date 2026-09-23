import fs from "fs";
import path from "path";

// Namespaces introduced by the reach work. Every locale must carry exactly the
// English key set, so a missing translation is a failing test rather than a
// silent fallback. Later tasks append to this list.
const NAMESPACES = ["seo", "notFound", "consent", "admin", "moments_section", "home", "download", "meet", "learnKorean", "communities", "errors"];

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const flatten = (o: any, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
const en = read("eng.json");

describe.each(NAMESPACES)("locale parity: %s", (ns) => {
  const expected = flatten(en[ns] || {}).sort();

  it("exists in English", () => {
    expect(expected.length).toBeGreaterThan(0);
  });

  it.each(files)("%s carries the same keys as English", (file) => {
    const value = read(file)[ns];
    expect(value ? flatten(value).sort() : null).toEqual(expected);
  });

  it("has 18 locale files", () => {
    expect(files.length).toBe(18);
  });
});
