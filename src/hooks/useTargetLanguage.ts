import { useTranslation } from "react-i18next";
import { toBaseIso6391 } from "../utils/languages";

const DEFAULT_TARGET_LANGUAGE = "en";

/**
 * ISO 639-1 code for the viewer's current UI language, for use as the
 * `targetLanguage` body field when translating a moment or comment on tap.
 *
 * i18next's registered language keys for this app match `toBaseIso6391`
 * exactly ("en", "ko", "zh", "ar", ...) with one exception: Traditional
 * Chinese is registered as "zh_TW" (underscore, see src/utils/i18n.ts).
 * `toBaseIso6391` only recognizes a hyphen separator, so both "zh_TW" and its
 * hyphenated spelling "zh-TW" are special-cased to "zh-TW" up front --
 * otherwise "zh_TW" resolves to null (no hyphen found, and the whole
 * five-char string isn't a two-letter base) and "zh-TW" would collapse to
 * bare "zh", losing the Traditional/Simplified distinction the backend's
 * translation service needs.
 *
 * Falls back to "en" when the current language can't be mapped at all.
 */
export function useTargetLanguage(): string {
  const { i18n } = useTranslation();
  const raw = (i18n.language || "").trim();
  const normalized = raw.toLowerCase().replace("_", "-");

  if (normalized === "zh-tw") {
    return "zh-TW";
  }

  return toBaseIso6391(raw) || DEFAULT_TARGET_LANGUAGE;
}
