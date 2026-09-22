// One language module for the whole app.
//
// Before this, the code/flag mapping lived in four places -- community/type.ts
// (two tables, one name-keyed and one code-keyed), community/utils.ts (a third,
// name-keyed, used by CommunityDetail) and tandem/LanguageFlagChip.tsx (a
// fourth, thirteen entries where the others had ten). They had already drifted.

/** "Portuguese (Brazil)" -> "Portuguese". Names without a parenthetical pass through. */
export function stripVariant(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

// Catalog codes with no usable ISO 639-1 base: sign languages, and Hawaiian
// (639-2 only). Ported from language_codes.dart:20.
const UNTAGGABLE = new Set(["ase", "bfi", "jsl", "kvk", "haw"]);

// 639-3/legacy codes that DO have a sensible 639-1 base. Dropping these sends
// "fil" to the two-letter slice below and yields "fi" -- Finnish.
const THREE_LETTER_BASES: Record<string, string> = { fil: "tl", prs: "fa" };

/**
 * Base ISO 639-1 code for a catalog code, or null when it cannot be
 * represented. 'pt-BR' -> 'pt', 'fil' -> 'tl', 'ase' -> null.
 */
export function toBaseIso6391(code: string): string | null {
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return null;
  if (UNTAGGABLE.has(trimmed)) return null;

  const mapped = THREE_LETTER_BASES[trimmed];
  if (mapped) return mapped;

  const hyphen = trimmed.indexOf("-");
  const base = hyphen > 0 ? trimmed.slice(0, hyphen) : trimmed;
  return base.length === 2 ? base : null;
}

// An ORDERED list, not an object: matching is `includes` and first hit wins,
// so insertion order is behaviour. Ported verbatim from language_codes.dart:61.
const DISPLAY_BY_NAME: ReadonlyArray<readonly [string, string]> = [
  ["japanese", "JP"], ["english", "EN"], ["korean", "KO"], ["chinese", "ZH"],
  ["spanish", "ES"], ["french", "FR"], ["german", "DE"], ["italian", "IT"],
  ["portuguese", "PT"], ["russian", "RU"], ["arabic", "AR"], ["hindi", "HI"],
  ["tajik", "TG"], ["vietnamese", "VI"], ["thai", "TH"], ["indonesian", "ID"],
  ["turkish", "TR"], ["filipino", "TL"], ["cantonese", "YUE"],
];

/**
 * Two-letter display code for a language NAME, uppercased.
 *
 * Mirrors LanguageCodes.displayCode in the Flutter app EXACTLY, including two
 * quirks it does not admit to: 'japanese' -> 'JP' is a country code, and
 * 'cantonese' -> 'YUE' is three letters. Anything outside the 19-name table
 * falls through to a two-letter slice, so 'Persian' -> 'PE', not 'FA'.
 *
 * Parity is the point. A web pill reading JA beside an app pill reading JP
 * would defeat the only reason the pill exists.
 */
export function displayCode(language: string): string {
  const lower = stripVariant(language).toLowerCase().trim();
  if (!lower) return "";

  for (const [name, code] of DISPLAY_BY_NAME) {
    if (lower.includes(name)) return code;
  }

  const iso = toBaseIso6391(lower);
  if (iso) return iso.toUpperCase();

  return language.toUpperCase().slice(0, language.length > 2 ? 2 : language.length);
}
