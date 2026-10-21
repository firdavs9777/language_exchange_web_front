/**
 * Formatting for the Reports page and its CSV. Pure functions only, so the
 * rules that matter most — a missing comparison is "—", never 0%, Infinity or
 * NaN — are testable without rendering anything.
 */

const finite = (v: any): v is number => typeof v === "number" && isFinite(v);

/** `—` rather than `0` for a number the backend didn't send: they differ. */
export const num = (value: any): string => (finite(value) ? value.toLocaleString("en-US") : "—");

/** A share of a total, whole percent; `—` when there is no total. */
export const pct = (part: any, total: any): string =>
  finite(part) && finite(total) && total > 0 ? `${Math.round((part / total) * 100)}%` : "—";

/** A 0..1 fraction as a whole percent, or `—`. */
export const fraction = (value: any): string => (finite(value) ? `${Math.round(value * 100)}%` : "—");

export type ChangeTone = "up" | "down" | "flat" | "none";

/**
 * Current against previous.
 * - previous missing (null/undefined): `—` — there is no history to compare.
 * - previous 0 and current above 0: "new" (a percentage would be Infinity).
 * - previous 0 and current 0: `—` (nothing happened in either period).
 */
export const change = (
  current: any,
  previous: any,
  newText = "new"
): { text: string; tone: ChangeTone } => {
  if (!finite(current) || !finite(previous)) return { text: "—", tone: "none" };
  if (previous === 0) return current > 0 ? { text: newText, tone: "up" } : { text: "—", tone: "none" };
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta > 0) return { text: `▲ ${delta}%`, tone: "up" };
  if (delta < 0) return { text: `▼ ${Math.abs(delta)}%`, tone: "down" };
  return { text: "0%", tone: "flat" };
};

/** `m:ss` — the mockup's "Avg time" per page view (0:48, 6:30). */
export const clock = (ms: any): string => {
  if (!finite(ms) || ms <= 0) return "0:00";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/** Coarse duration: 45s, 11m, 1h 5m — time per member in a section. */
export const shortDuration = (ms: any): string => {
  if (!finite(ms) || ms <= 0) return "0s";
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** Minutes and seconds: the average visit (3m 40s). */
export const visitDuration = (ms: any): string => {
  if (!finite(ms) || ms <= 0) return "0s";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

/** A flag from an ISO 3166-1 alpha-2 code, as two regional-indicator symbols. */
export const flagOf = (code: any): string => {
  const c = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(...c.split("").map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
};

/** i18next ids (`zh_TW`) to BCP 47 (`zh-TW`); Intl throws on the underscore. */
const bcp = (locale: string): string => (locale || "en").replace(/_/g, "-");

const namesCache: Record<string, any> = {};
const displayNames = (locale: string, type: "region" | "language"): any => {
  const key = `${type}:${locale}`;
  if (!(key in namesCache)) {
    try {
      namesCache[key] = new (Intl as any).DisplayNames([bcp(locale)], { type });
    } catch (e) {
      try {
        namesCache[key] = new (Intl as any).DisplayNames(["en"], { type });
      } catch (e2) {
        namesCache[key] = null;
      }
    }
  }
  return namesCache[key];
};

const nameOf = (code: any, locale: string, type: "region" | "language"): string => {
  const raw = String(code || "");
  if (!raw) return "—";
  const names = displayNames(locale, type);
  try {
    const name = names ? names.of(type === "region" ? raw.toUpperCase() : raw.replace(/_/g, "-")) : undefined;
    return name || raw;
  } catch (e) {
    return raw;
  }
};

/** A country's name in the reader's language, from its ISO code. */
export const regionName = (code: any, locale = "en"): string => nameOf(code, locale, "region");

/** A site language's name in the reader's language, from its code. */
export const languageName = (code: any, locale = "en"): string => nameOf(code, locale, "language");

const KST_MS = 9 * 60 * 60 * 1000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The KST calendar day of an instant (the backend's period edges are KST midnights). */
export const kstDay = (value: any): string => {
  const t = Date.parse(String(value || ""));
  return isFinite(t) ? new Date(t + KST_MS).toISOString().slice(0, 10) : "";
};

/** Today in KST, for the date picker's `max`. */
export const kstToday = (now: number = Date.now()): string => new Date(now + KST_MS).toISOString().slice(0, 10);

/** A real `YYYY-MM-DD` day, or undefined. */
export const validDay = (value: any): string | undefined => {
  const v = String(value || "");
  if (!DAY_RE.test(v)) return undefined;
  const t = Date.parse(`${v}T00:00:00.000Z`);
  return isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? v : undefined;
};

type TFn = (key: string, options?: any) => string;

/** A landing source: "Direct", "campaign: oct_promo", or the host/network name. */
export const sourceLabel = (src: { type?: string; name?: string } | null | undefined, t: TFn): string => {
  const type = (src && src.type) || "direct";
  const name = (src && src.name) || "";
  if (type === "direct") return t("admin.reports.sourceDirect") || "Direct";
  if (type === "campaign") return t("admin.reports.sourceCampaign", { name }) || `campaign: ${name}`;
  return name || type;
};

const SECTION_KEYS: Record<string, [string, string]> = {
  chat: ["sectionChat", "Chat"],
  community: ["sectionCommunity", "Community"],
  moments: ["sectionMoments", "Moments"],
  study: ["sectionStudy", "AI Study"],
  profile: ["sectionProfile", "Profile"],
};

export const sectionLabel = (section: string, t: TFn): string => {
  const entry = SECTION_KEYS[section];
  return entry ? t(`admin.reports.${entry[0]}`) || entry[1] : section;
};

const PLACEMENT_KEYS: Record<string, [string, string]> = {
  hero: ["placementHero", "Hero"],
  "download-page": ["placementDownloadPage", "Download page"],
  "sticky-banner": ["placementStickyBanner", "Sticky banner"],
  popup: ["placementPopup", "Popup"],
  footer: ["placementFooter", "Footer"],
  "final-cta": ["placementFinalCta", "Final call to action"],
  unknown: ["placementUnknown", "Unknown"],
};

/** The store buttons' placements, named; any other placement shows as sent. */
export const placementLabel = (placement: string, t: TFn): string => {
  const entry = PLACEMENT_KEYS[placement];
  return entry ? t(`admin.reports.${entry[0]}`) || entry[1] : placement;
};

const DEVICE_KEYS: Record<string, [string, string]> = {
  mobile: ["deviceMobile", "Mobile"],
  desktop: ["deviceDesktop", "Desktop"],
  tablet: ["deviceTablet", "Tablet"],
};

export const deviceLabel = (device: string, t: TFn): string => {
  const entry = DEVICE_KEYS[device];
  return entry ? t(`admin.reports.${entry[0]}`) || entry[1] : device || "—";
};
