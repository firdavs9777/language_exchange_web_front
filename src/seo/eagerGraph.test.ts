/**
 * @jest-environment node
 */
// A guard on what a first-time visitor downloads before anything on a
// marketing page paints.
//
// Task B6 moved the bootstrap-icons stylesheet out of the entrypoint: only
// modules that sit *behind* a React.lazy boundary may import src/lazyIcons.ts
// (or the package directly). Nothing enforces that, and the bundle budget
// cannot: the icon CSS is ~13.5 KB gzipped and the budget's headroom is wider
// than that, so a regression would slip through as a number nobody reads.
//
// So: build the static import graph the way webpack does for the entrypoint --
// start at the three real roots, follow only *static* `import`/`export ... from`
// declarations, and stop at `import()`, which is exactly where a chunk begins.
// If lazyIcons or bootstrap-icons turns up in that graph, something eager
// imported it and the font is back in main.css.
//
// Same idea as src/components/growth/storeUrls.test.ts: a cheap source-level
// rule, checked by reading files rather than by building.
import fs from "fs";
import path from "path";

const SRC = path.join(__dirname, "..");

// The three modules that are loaded eagerly in production. index.tsx is the
// webpack entry; routes.tsx and renderRoute.tsx are the two entry points the
// prerender walks, and every eager page hangs off the route tree.
const ROOTS = [
  path.join(SRC, "index.tsx"),
  path.join(SRC, "router", "routes.tsx"),
  path.join(SRC, "seo", "prerender", "renderRoute.tsx"),
];

const FORBIDDEN_MODULE = path.join(SRC, "lazyIcons.ts");
const FORBIDDEN_PACKAGE = "bootstrap-icons";

// Extensions we parse. Anything else (.css, .scss, .json, images) is a leaf:
// it has no `import ... from` of its own that could reach further into src/.
const PARSED = [".ts", ".tsx", ".js", ".jsx"];
const RESOLVE_EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss"];

/**
 * Strips comments so the specifier regexes below see code only. String and
 * template literals are kept verbatim -- a specifier lives inside one. Without
 * this, prose wins: src/design/index.ts documents the TS 3.7
 * `export type { X } from "./Y"` trap in a comment, and a naive scan reads that
 * as a real edge to a module that does not exist.
 */
function stripNonCode(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source.charAt(i);
    const next = source.charAt(i + 1);
    if (c === "/" && next === "/") {
      while (i < n && source.charAt(i) !== "\n") i += 1;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(source.charAt(i) === "*" && source.charAt(i + 1) === "/")) i += 1;
      i += 2;
    } else if (c === '"' || c === "'" || c === "`") {
      // Keep the quotes and the body: a specifier lives inside one. Escapes
      // are honoured so a \" cannot end the literal early.
      out += c;
      i += 1;
      while (i < n && source.charAt(i) !== c) {
        if (source.charAt(i) === "\\") {
          out += source.charAt(i) + source.charAt(i + 1);
          i += 2;
          continue;
        }
        out += source.charAt(i);
        i += 1;
      }
      out += c;
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/**
 * Static `import`/`export ... from` specifiers only.
 *
 * Deliberately misses `import("x")`: a dynamic import is a chunk boundary, and
 * everything beyond it is precisely what this test must NOT walk into. The
 * `from` (or the bare `import "x";` side-effect form) is what separates the
 * two -- `import(` is always followed by the specifier, never by `from`.
 *
 * The gap before `from` excludes `;` and quotes, so the match cannot run past
 * the end of one statement and pick up an unrelated specifier further down.
 */
function staticSpecifiers(source: string): string[] {
  const code = stripNonCode(source);
  const out: string[] = [];
  // `import ... from "x"` / `export ... from "x"`, across newlines.
  const withFrom = /(?:^|[\s;}])(?:import|export)\s+(?:[^;'"]*?\s)?from\s*["']([^"']+)["']/g;
  // Side-effect imports: `import "x";` -- no `from`, no braces.
  const sideEffect = /(?:^|[\s;}])import\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = withFrom.exec(code)) !== null) out.push(m[1]);
  while ((m = sideEffect.exec(code)) !== null) out.push(m[1]);
  return out;
}

/** Node-ish resolution for a relative specifier: file, +ext, or /index.+ext. */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of RESOLVE_EXT) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  for (const ext of RESOLVE_EXT) {
    if (!ext) continue;
    const candidate = path.join(base, "index" + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

interface Graph {
  /** Every file reachable from ROOTS through static imports. */
  modules: string[];
  /** "<importer> -> <package>" for every static package import we care about. */
  packageHits: string[];
  /** Specifiers we could not resolve, so a silent miss shows up as a failure. */
  unresolved: string[];
}

function walkEagerGraph(): Graph {
  const seen: Record<string, boolean> = {};
  const modules: string[] = [];
  const packageHits: string[] = [];
  const unresolved: string[] = [];
  const queue = ROOTS.slice();

  while (queue.length) {
    const file = queue.shift() as string;
    if (seen[file]) continue;
    seen[file] = true;
    modules.push(file);
    if (PARSED.indexOf(path.extname(file)) === -1) continue;

    const source = fs.readFileSync(file, "utf8");
    for (const spec of staticSpecifiers(source)) {
      if (spec.charAt(0) === ".") {
        const resolved = resolveRelative(file, spec);
        if (resolved) {
          if (!seen[resolved]) queue.push(resolved);
        } else {
          unresolved.push(`${path.relative(SRC, file)} -> ${spec}`);
        }
      } else if (spec === FORBIDDEN_PACKAGE || spec.indexOf(FORBIDDEN_PACKAGE + "/") === 0) {
        // A package import, but the one package that must never be static
        // here: bootstrap-icons carries the webfont and ~2,000 glyph rules.
        packageHits.push(`${path.relative(SRC, file)} -> ${spec}`);
      }
      // Every other package import (react, lucide, bootstrap, ...) is out of
      // scope: this test is about the icon font, not about dependency weight.
    }
  }
  return { modules, packageHits, unresolved };
}

const graph = walkEagerGraph();

it("walks a real graph from all three eager roots", () => {
  // A resolver that quietly resolved nothing would make every other assertion
  // here pass vacuously, so pin the shape: the roots are reachable and the
  // graph is the ~150-module app shell, not a handful of files.
  for (const root of ROOTS) expect(fs.existsSync(root)).toBe(true);
  expect(graph.modules.length).toBeGreaterThan(100);
  expect(graph.modules.indexOf(path.join(SRC, "App.tsx"))).toBeGreaterThan(-1);
  expect(graph.modules.indexOf(path.join(SRC, "components", "footer", "FooterMain.tsx"))).toBeGreaterThan(-1);
  expect(graph.unresolved).toEqual([]);
});

it("never reaches src/lazyIcons.ts without crossing a React.lazy boundary", () => {
  expect(fs.existsSync(FORBIDDEN_MODULE)).toBe(true);
  const offenders = graph.modules.filter((f) => f === FORBIDDEN_MODULE);
  expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
});

it("never statically imports bootstrap-icons from an eager module", () => {
  // The other half of the same rule: importing the package directly would put
  // the stylesheet back into main.css just as surely as importing lazyIcons.
  expect(graph.packageHits).toEqual([]);
});

it("proves the guard can fire, on a module that really does import the icons", () => {
  // lazyIcons.ts is the only file allowed to name the package. If this ever
  // stops holding, the two assertions above are guarding nothing.
  const text = fs.readFileSync(FORBIDDEN_MODULE, "utf8");
  expect(staticSpecifiers(text)).toContain("bootstrap-icons/font/bootstrap-icons.css");
});
