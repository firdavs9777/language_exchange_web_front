/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";

// The admin announcements console reads `t("admin.announcements.<key>") || "English"`.
// Every key it uses must exist in all 18 locales, and eng.json must say what the
// inline fallback says, so the two can never drift into different English.
const ADMIN = path.resolve(__dirname, "../../components/admin");
const LOCALES = __dirname;

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

const used = new Map<string, string>();
for (const file of sources(ADMIN)) {
  const s = fs.readFileSync(file, "utf8");
  const re = /t\("admin\.announcements\.(\w+)"\)\s*\|\|\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) used.set(m[1], JSON.parse(`"${m[2]}"`));
}

const locales = fs.readdirSync(LOCALES).filter((f) => f.endsWith(".json"));

it("finds the console's keys", () => {
  expect(used.size).toBeGreaterThanOrEqual(80);
  expect(locales).toHaveLength(18);
});

it("eng.json matches every inline English fallback", () => {
  const eng = JSON.parse(fs.readFileSync(path.join(LOCALES, "eng.json"), "utf8")).admin.announcements;
  used.forEach((fallback, key) => expect([key, eng[key]]).toEqual([key, fallback]));
});

it.each(locales)("%s has every admin.announcements key, non-empty", (file) => {
  const ann = JSON.parse(fs.readFileSync(path.join(LOCALES, file), "utf8")).admin.announcements || {};
  used.forEach((_fallback, key) => {
    expect([key, typeof ann[key] === "string" && ann[key].trim().length > 0]).toEqual([key, true]);
  });
});
