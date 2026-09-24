/**
 * The structured story stickers — text/emoji overlays, mentions and the link
 * sticker — in the exact shape `POST /stories` stores them.
 *
 * This module is the single place that knows the wire format, because three
 * things have to agree on it: the composer that builds a draft, the serializer
 * that uploads it, and the viewer that paints it back. `parseOverlays()` in the
 * backend's `controllers/stories.js` is deliberately forgiving — anything it
 * cannot read it silently drops — so a client that guesses wrong loses the
 * sticker without ever seeing an error. Everything below mirrors that parser's
 * allowed values and ranges so nothing is ever silently thrown away.
 *
 * Overlays are STRUCTURAL, never baked into the image: the app's studio
 * (`lib/pages/stories/create/studio/overlay_draft.dart`) uploads the same JSON,
 * so a story composed on the web is editable-looking and legible in the app and
 * vice versa. Drawing and filters are the app's only baked layers and are out
 * of scope here.
 *
 * The hex strings in `OVERLAY_COLORS` are WIRE VALUES, not styling: the backend
 * requires `/^#[0-9a-fA-F]{6}$/` and stores what it is given. The palette is
 * mirrored as Tailwind swatch classes so no component has to inline one.
 */

export type OverlayType = "text" | "emoji";
export type OverlayFontStyle = "sans-serif" | "serif" | "bold" | "handwritten";
export type OverlayBgMode = "none" | "semi" | "solid";

/** `parseOverlays()` stops reading after this many entries. */
export const OVERLAY_MAX_COUNT = 20;
/** `parseMentions()` slices to this many. */
export const MENTION_MAX_COUNT = 5;
/** `parseOverlays()` truncates content at this length. */
export const OVERLAY_MAX_CONTENT = 500;

export const OVERLAY_FONT_STYLES: OverlayFontStyle[] = [
  "sans-serif",
  "serif",
  "bold",
  "handwritten",
];

export const OVERLAY_BG_MODES: OverlayBgMode[] = ["none", "semi", "solid"];

/**
 * The colours the composer offers. `hex` is what travels to the server;
 * `swatch` is the Tailwind class the picker button paints itself with, so the
 * palette needs no inline style anywhere.
 */
export const OVERLAY_COLORS: { hex: string; swatch: string }[] = [
  { hex: "#FFFFFF", swatch: "bg-white" },
  { hex: "#000000", swatch: "bg-black" },
  { hex: "#FF3B30", swatch: "bg-red-500" },
  { hex: "#FF9500", swatch: "bg-orange-500" },
  { hex: "#FFCC00", swatch: "bg-yellow-400" },
  { hex: "#34C759", swatch: "bg-green-500" },
  { hex: "#0A84FF", swatch: "bg-blue-500" },
  { hex: "#AF52DE", swatch: "bg-purple-500" },
  { hex: "#FF2D55", swatch: "bg-pink-500" },
  { hex: "#8E8E93", swatch: "bg-gray-400" },
];

/** Font styles as classes. There is no handwriting face in the app's stack, so
 * `handwritten` borrows the serif italic rather than shipping a font for one
 * sticker. */
export const OVERLAY_FONT_CLASS: Record<OverlayFontStyle, string> = {
  "sans-serif": "font-sans",
  serif: "font-serif",
  bold: "font-sans font-bold",
  handwritten: "font-serif italic",
};

/** `bgMode` is the plate BEHIND the glyphs; the glyph colour is the overlay's
 * own `color` in every mode. */
export const OVERLAY_BG_CLASS: Record<OverlayBgMode, string> = {
  none: "drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]",
  semi: "rounded-lg bg-black/40 px-2 py-0.5",
  solid: "rounded-lg bg-black px-2 py-0.5",
};

/**
 * Scale is continuous on the wire (0.5–3.0, the backend clamps it) but the
 * composer offers four steps, which lets the rendered size be a Tailwind text
 * class instead of an inline `transform`. Anything arriving from the app that
 * falls between steps snaps to the nearest one for painting only — the number
 * itself is never rewritten.
 */
export const OVERLAY_SCALE_STEPS = [0.75, 1, 1.5, 2.5];

const SCALE_CLASSES = ["text-sm", "text-lg", "text-2xl", "text-4xl"];

export function overlayScaleClass(scale: number): string {
  const value = Number.isFinite(scale) ? scale : 1;
  let best = 0;
  for (let i = 1; i < OVERLAY_SCALE_STEPS.length; i += 1) {
    if (Math.abs(OVERLAY_SCALE_STEPS[i] - value) < Math.abs(OVERLAY_SCALE_STEPS[best] - value)) {
      best = i;
    }
  }
  return SCALE_CLASSES[best];
}

export const clamp01 = (value: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
};

export const clampScale = (value: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 0.5), 3);
};

/** Four decimals is ~0.04% of a 1080px canvas: below one pixel, and it keeps
 * the JSON from carrying float noise. */
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export interface OverlayDraft {
  /** Local only — the React key and the drag target. Never uploaded. */
  id: string;
  type: OverlayType;
  content: string;
  /** 0–1 fraction of the canvas, the overlay's CENTRE (app parity). */
  x: number;
  y: number;
  scale: number;
  color: string;
  fontStyle: OverlayFontStyle;
  bgMode: OverlayBgMode;
}

export interface SerializedOverlay {
  type: OverlayType;
  content: string;
  x: number;
  y: number;
  scale: number;
  color: string;
  fontStyle: OverlayFontStyle;
  bgMode: OverlayBgMode;
}

let seq = 0;
/** Monotonic, not random: a story composer does not need crypto, and a
 * deterministic id keeps the tests readable. */
export const nextOverlayId = (prefix: string): string => {
  seq += 1;
  return prefix + "-" + seq;
};

export function newOverlayDraft(partial?: Partial<OverlayDraft>): OverlayDraft {
  return {
    id: nextOverlayId("ov"),
    type: "text",
    content: "",
    x: 0.5,
    y: 0.4,
    scale: 1,
    color: OVERLAY_COLORS[0].hex,
    fontStyle: "sans-serif",
    bgMode: "none",
    ...(partial || {}),
  };
}

/**
 * Drafts → the `overlays` field. Empty content is dropped rather than sent:
 * the backend drops it anyway, and an invisible sticker that still counts
 * against the 20 is worse than no sticker.
 */
export function serializeOverlays(drafts: OverlayDraft[]): SerializedOverlay[] {
  const out: SerializedOverlay[] = [];
  for (const draft of drafts || []) {
    if (out.length >= OVERLAY_MAX_COUNT) break;
    if (!draft) continue;
    const content = String(draft.content || "").trim().slice(0, OVERLAY_MAX_CONTENT);
    if (!content) continue;
    out.push({
      type: draft.type === "emoji" ? "emoji" : "text",
      content,
      x: round4(clamp01(draft.x)),
      y: round4(clamp01(draft.y)),
      scale: clampScale(draft.scale),
      color: /^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : "#FFFFFF",
      fontStyle:
        OVERLAY_FONT_STYLES.indexOf(draft.fontStyle) >= 0 ? draft.fontStyle : "sans-serif",
      bgMode: OVERLAY_BG_MODES.indexOf(draft.bgMode) >= 0 ? draft.bgMode : "none",
    });
  }
  return out;
}

export interface MentionDraft {
  id: string;
  userId: string;
  name: string;
  /** 0–1 in the composer, like an overlay; converted on the way out. */
  x: number;
  y: number;
}

export interface SerializedMention {
  user: string;
  /** 0–100. Mentions really are a different unit from overlays on this API —
   * `parseMentions()` clamps to 0–100 while `parseOverlays()` clamps to 0–1 —
   * so the conversion happens exactly here and nowhere else. */
  x: number;
  y: number;
}

export function serializeMentions(drafts: MentionDraft[]): SerializedMention[] {
  const out: SerializedMention[] = [];
  const seen: { [id: string]: boolean } = {};
  for (const draft of drafts || []) {
    if (out.length >= MENTION_MAX_COUNT) break;
    if (!draft || !draft.userId || seen[draft.userId]) continue;
    seen[draft.userId] = true;
    out.push({
      user: draft.userId,
      x: round4(clamp01(draft.x) * 100),
      y: round4(clamp01(draft.y) * 100),
    });
  }
  return out;
}

export interface LinkDraft {
  url: string;
  title: string;
  displayText: string;
}

/**
 * The composer's half of `lib/storyLink.js`. Deliberately strict for the same
 * reason the server is: a user-supplied URL rendered to other people is a
 * phishing surface, so http/https only and a host that looks like a host. The
 * server re-validates; this exists so the author is told before they publish.
 *
 * Hand-parsed rather than `new URL()` so the module stays free of browser
 * globals and can be reasoned about in a plain Node test.
 */
export function parseLinkUrl(raw: string): { url: string; host: string } | null {
  const value = String(raw || "").trim();
  if (!value || value.length > 2048) return null;
  const match = /^(https?):\/\/([^\s/?#]+)([^\s]*)$/i.exec(value);
  if (!match) return null;
  const authority = match[2];
  // No credentials in a sticker: "https://paypal.com@evil.tld" is the trick.
  if (authority.indexOf("@") >= 0) return null;
  const host = authority.split(":")[0].replace(/^www\./i, "").toLowerCase();
  if (!host || host.indexOf(".") <= 0 || /\.$/.test(host)) return null;
  return { url: value, host };
}

/** Draft → the `link` field, or null when the sticker should not be sent. */
export function serializeLink(draft: LinkDraft | null): LinkDraft | null {
  if (!draft) return null;
  const parsed = parseLinkUrl(draft.url);
  if (!parsed) return null;
  return {
    url: parsed.url,
    title: String(draft.title || "").trim().slice(0, 120),
    displayText: String(draft.displayText || "").trim().slice(0, 30) || parsed.host,
  };
}

export interface VideoConstraints {
  maxDuration?: number;
  maxDurationFormatted?: string;
  maxSize?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

/** `GET /stories/video-config` → the `video` block, whatever the envelope. */
export function videoConstraintsOf(payload: any): VideoConstraints | null {
  const data = payload && payload.data ? payload.data : payload;
  if (!data || !data.video) return null;
  return data.video as VideoConstraints;
}

/**
 * What is knowable about a file before it is read: its declared MIME type and
 * its byte length. Returns the i18n suffix of the reason, or null.
 */
export function videoFileError(
  file: { type?: string; size?: number },
  constraints: VideoConstraints | null
): "type" | "size" | null {
  if (!file || !constraints) return null;
  const allowed = constraints.allowedTypes;
  if (allowed && allowed.length > 0 && file.type && allowed.indexOf(file.type) === -1) {
    return "type";
  }
  if (constraints.maxSize && (file.size || 0) > constraints.maxSize) return "size";
  return null;
}

/** Duration only exists once the browser has read the metadata, so it is its
 * own check, fired from the preview element's `loadedmetadata`. */
export function videoDurationError(
  seconds: number,
  constraints: VideoConstraints | null
): "duration" | null {
  if (!constraints || !constraints.maxDuration) return null;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds > constraints.maxDuration + 0.5 ? "duration" : null;
}

export function formatMegabytes(constraints: VideoConstraints | null): string {
  if (!constraints) return "";
  if (constraints.maxSizeMB) return Math.round(constraints.maxSizeMB) + " MB";
  if (constraints.maxSize) return Math.round(constraints.maxSize / (1024 * 1024)) + " MB";
  return "";
}

export function formatSeconds(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ":" + (secs < 10 ? "0" : "") + secs;
}

/**
 * The ONLY inline style these stickers need: two numbers out of the JSON that
 * no utility class can express. Everything else — font, weight, plate, size —
 * is a class from the maps above.
 */
export function overlayPositionStyle(x: number, y: number): { left: string; top: string } {
  return { left: clamp01(x) * 100 + "%", top: clamp01(y) * 100 + "%" };
}

/** Mentions come back from the server on the 0–100 scale, nested under
 * `position`. */
export function mentionPositionStyle(position?: { x?: number; y?: number }): {
  left: string;
  top: string;
} {
  const x = clamp01(((position && position.x) || 0) / 100);
  const y = clamp01(((position && position.y) || 0) / 100);
  return { left: x * 100 + "%", top: y * 100 + "%" };
}
