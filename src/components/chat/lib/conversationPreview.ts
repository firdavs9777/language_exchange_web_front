/**
 * The one-line preview under a conversation in the list.
 *
 * Read from `lastMessage.messageType` first: before backend P1-CHAT-7 the
 * conversations endpoint does not populate `media`, so a call, a location or
 * a photo arrives as `{messageType}` only. `media.type` refines it when it is
 * there. Unknown types fall back to the text, then to "Attachment".
 */
type Translate = (key: string, options?: any) => string;

const tr = (t: Translate, key: string, fallback: string): string => t(key) || fallback;

export function previewOf(msg: any, t: Translate): string {
  if (!msg) return "";
  const text: string = (msg.message || msg.content || "").toString();
  const type: string = msg.messageType || "";
  const mediaType: string = (msg.media && msg.media.type) || "";

  // Legacy rows written by the old POST /messages/conversations.
  if (text === "Conversation started" && !mediaType) return "";

  if (type === "call" || mediaType === "call") return tr(t, "chatPage.preview.call", "📞 Call");
  if (type === "location" || mediaType === "location") return tr(t, "chatPage.preview.location", "📍 Location");
  if (type === "voice" || mediaType === "voice") return tr(t, "chatPage.preview.voice", "🎤 Voice message");
  if (type === "gif") return tr(t, "chatPage.preview.gif", "GIF");
  if (type === "story_share") return tr(t, "chatPage.preview.story", "📖 Story");
  if (type === "poll") return tr(t, "chatPage.preview.poll", "📊 Poll");
  if (type === "sticker") return text;

  if (mediaType) {
    if (mediaType.indexOf("image") === 0) {
      return text ? `🖼️ ${text}` : tr(t, "chatPage.preview.photo", "🖼️ Photo");
    }
    if (mediaType.indexOf("video") === 0) {
      return text ? `🎥 ${text}` : tr(t, "chatPage.preview.video", "🎥 Video");
    }
    return text ? `📎 ${text}` : tr(t, "chatPage.preview.file", "📎 File");
  }
  if (type === "media") return text || tr(t, "chatPage.preview.attachment", "📎 Attachment");
  return text;
}
