/**
 * @jest-environment node
 */
// What a first-time visitor downloads before anything on a marketing page can
// become interactive: the main JS entrypoint plus the main stylesheet, gzipped
// the way nginx serves them. Lazy chunks are deliberately not counted -- the
// whole point of task B6 is that they are not on this path.
//
// This suite runs only when BUNDLE_BUDGET=1, which `npm run test:budget` sets
// and which the deploy script therefore sets too. A plain `npm test` skips it:
// otherwise a stale build/ lying around locally fails an unrelated test run
// with a bundle error the developer did not cause, and the useful failure --
// the one right after `react-scripts build` in `npm run deploy` -- gets
// trained away. It also skips when there is no build/ at all.
import fs from "fs";
import path from "path";
import zlib from "zlib";

const BUILD = path.join(__dirname, "..", "..", "build");
const MANIFEST = path.join(BUILD, "asset-manifest.json");
const LOCALES = path.join(__dirname, "..", "utils", "locales");

/**
 * The ceiling for the whole first-paint payload, in gzipped kilobytes.
 *
 * NOT the 150 KB the spec asked for, and it never will be until two things
 * that are not route code leave the entrypoint:
 *
 *   - ~300 KB gzipped of i18n: all 18 locale JSON files are `import`ed
 *     statically by src/utils/i18n.ts, so every visitor downloads all 18;
 *   - bootstrap + react-bootstrap, used by the shell, the navbar and every
 *     public page (retiring them is spec §5.6, out of scope here).
 *
 * moment, iso-639-1's language table and react-icons make up most of the rest,
 * all pulled in by the *prerendered* /moments feed, which cannot be lazy.
 *
 * History, so the next re-baseline is a decision and not a reflex: B6's split
 * took the measured total from 724.5 KB to 559.6 KB and set the budget at
 * 559.6 + 5% = 588. Phase B's 90 marketing strings in 18 locales then added
 * ~45 KB gzipped (610.1 measured), and the budget was raised to 641 rather
 * than defended -- which is exactly why APP_BUDGET_KB below exists. Raising
 * this number a third time without a matching, explained rise in APP_BUDGET_KB
 * means locale growth, and nothing else.
 */
export const BUDGET_KB = 641;

/**
 * The ceiling for everything that is NOT locale JSON, in gzipped kilobytes.
 *
 * The load-bearing half of this test. A single whole-entrypoint number is
 * trivially re-baselined: 18 locales grow, the total grows, someone bumps the
 * constant, and route code that crept back into main.js rides along invisibly.
 * Subtracting the locale weight leaves the number that actually tracks the
 * split, so a group collapsing back into the entrypoint fails here even while
 * the total still fits.
 *
 * Measured on this commit: 607.4 KB total − 305.8 KB of locale JSON = 301.5 KB
 * of app code, + 5% = 316.6 → 317. Same rule as BUDGET_KB, applied to the part
 * that is under this repo's control.
 */
export const APP_BUDGET_KB = 317;

const readGzipKb = (assetPath: string): number => {
  const file = path.join(BUILD, assetPath.replace(/^\//, ""));
  return zlib.gzipSync(fs.readFileSync(file)).length / 1024;
};

/**
 * The gzipped weight of the 18 locale files, measured from source.
 *
 * An approximation on purpose, and an honest one: what ships is the JSON
 * inlined into main.js as minified object literals, which no manifest entry
 * isolates, so the only way to weigh it exactly would be to parse the bundle.
 * Gzipping the concatenated sources is within a few percent of that and, more
 * to the point, it moves with the locales -- which is all this subtraction
 * needs in order to stop locale growth from masking app growth.
 */
const localesGzipKb = (): number => {
  const files = fs
    .readdirSync(LOCALES)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const buffers = files.map((f) => fs.readFileSync(path.join(LOCALES, f)));
  return zlib.gzipSync(Buffer.concat(buffers)).length / 1024;
};

const enabled = process.env.BUNDLE_BUDGET === "1";
const hasBuild = fs.existsSync(MANIFEST);
const describeIfBuilt = enabled && hasBuild ? describe : describe.skip;

if (!enabled) {
  // eslint-disable-next-line no-console
  console.log("[bundleBudget] BUNDLE_BUDGET is not 1; skipping. Run `npm run test:budget`.");
} else if (!hasBuild) {
  // eslint-disable-next-line no-console
  console.log("[bundleBudget] no build/asset-manifest.json; skipping. Run `npm run build` first.");
}

describeIfBuilt("marketing bundle budget", () => {
  const manifest = hasBuild ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { files: {}, entrypoints: [] };
  const entrypoints: string[] = manifest.entrypoints || [];

  it("ships exactly one main JS chunk and one main stylesheet", () => {
    expect(entrypoints.filter((f) => f.endsWith(".js")).length).toBe(1);
    expect(entrypoints.filter((f) => f.endsWith(".css")).length).toBe(1);
  });

  it("keeps app code and the whole first-paint payload inside their budgets", () => {
    const js = entrypoints.filter((f) => f.endsWith(".js")).map(readGzipKb);
    const css = entrypoints.filter((f) => f.endsWith(".css")).map(readGzipKb);
    const total = js.concat(css).reduce((a, b) => a + b, 0);
    const locales = localesGzipKb();
    const appCode = total - locales;
    /* eslint-disable no-console */
    console.log(
      `[bundleBudget] main.js ${js[0].toFixed(1)} KB + main.css ${css[0].toFixed(1)} KB` +
        ` = ${total.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`
    );
    console.log(
      `[bundleBudget] app code ${appCode.toFixed(1)} KB gzipped` +
        ` (budget ${APP_BUDGET_KB} KB) = total − ${locales.toFixed(1)} KB of locale JSON`
    );
    /* eslint-enable no-console */
    // App code first: it is the assertion that means something. The total is
    // still asserted, so the two together cannot both drift.
    expect(appCode).toBeLessThanOrEqual(APP_BUDGET_KB);
    expect(total).toBeLessThanOrEqual(BUDGET_KB);
  });

  it("splits the authenticated app out of the entrypoint", () => {
    // Lazy route groups: auth, profile, moments composer, chat, stories,
    // settings, community-authenticated, courses, admin. If this collapses,
    // something eager started importing a lazy module and dragged its whole
    // group back into main.js.
    //
    // The floor is 35 against 47 measured, not the 9 groups: webpack emits a
    // chunk per split point plus its shared vendor chunks, so a single group
    // folding back into main.js costs several chunks at once and a floor near
    // the real number is the only one that notices. Twelve chunks of slack
    // absorbs the ordinary churn -- a lazy page added or merged -- without
    // absorbing a whole group.
    const lazyChunks = Object.keys(manifest.files || {}).filter((f) => /^static\/js\/.*\.chunk\.js$/.test(f));
    expect(lazyChunks.length).toBeGreaterThanOrEqual(35);
  });
});
