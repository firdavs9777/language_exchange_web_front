import React from "react";
import {
  MoreVertical,
  Paperclip,
  Play,
  Pause,
  Edit3,
  Globe,
  RefreshCw,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactionRow from "./actions/ReactionRow";
import CorrectionCard, { MessageCorrection } from "./components/CorrectionCard";
import TranslationCard from "./components/TranslationCard";
import { firstLink } from "./utils/linkDetector";

/**
 * One message, lifted out of `ChatContent`'s `.map` unchanged — same classes,
 * same structure, same handlers — and wrapped in `React.memo`. Inlined, every
 * keystroke in the composer re-rendered the whole thread; memoized, only the
 * messages whose own props changed re-render.
 *
 * The shared message shapes live here because this is the component that
 * renders them; `ChatContent` imports them back.
 */

export interface MessageSender {
  _id: string;
  name: string;
  username?: string;
  images?: string[];
  userMode?: string;
}

export interface MessageReceiver {
  _id: string;
  name: string;
  username?: string;
  images?: string[];
}

export interface MessageMedia {
  url: string;
  type: string;
  thumbnail?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  waveform?: number[];
  dimensions?: { width: number; height: number };
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

export interface Message {
  _id: string;
  message: string;
  sender: MessageSender;
  receiver: MessageReceiver | string;
  messageType?: string;
  read?: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
  isOptimistic?: boolean;
  status?: MessageStatus;
  media?: MessageMedia;
  replyTo?: { _id: string; message: string; sender: { _id: string; name: string } };
  corrections?: MessageCorrection[];
  reactions?: Array<{ user: string; emoji: string; createdAt?: string }>;
  isEdited?: boolean;
  editedAt?: string;
  pinned?: boolean;
}

export type BubblePosition = "single" | "first" | "middle" | "last";

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getBubbleRadius = (isSent: boolean, position: string): string => {
  if (isSent) {
    switch (position) {
      case "single": return "18px 18px 4px 18px";
      case "first": return "18px 18px 4px 18px";
      case "middle": return "18px 4px 4px 18px";
      case "last": return "18px 4px 18px 18px";
      default: return "18px";
    }
  } else {
    switch (position) {
      case "single": return "18px 18px 18px 4px";
      case "first": return "18px 18px 18px 4px";
      case "middle": return "4px 18px 18px 4px";
      case "last": return "4px 18px 18px 18px";
      default: return "18px";
    }
  }
};

/** The day heading above the first message of each day. */
export const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="date-separator">
    <span className="date-text">{label}</span>
  </div>
);

export interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  position: BubblePosition;
  /** First message of its date group — no top gap. */
  isFirstInGroup: boolean;
  showAvatar: boolean;
  hideAvatarSpace: boolean;
  avatarUrl: string;
  currentUserId: string;
  otherUserName: string;
  timeLabel: string;
  isTranslationOpen: boolean;
  targetLanguage: string;
  playingAudioId: string | null;
  audioProgress: number;
  audioElapsed: number;
  onTogglePlayback: (messageId: string, url: string) => void;
  onOpenActions: (message: Message) => void;
  onToggleReaction: (message: Message, emoji: string) => void;
  onToggleTranslation: (messageId: string) => void;
  onCorrect: (message: Message) => void;
  onCorrectionAccepted: (messageId: string, correctionId: string) => void;
  onRetry: (message: Message) => void;
}

const MessageBubbleView: React.FC<MessageBubbleProps> = ({
  message: msg,
  isSent,
  position,
  isFirstInGroup,
  showAvatar,
  hideAvatarSpace,
  avatarUrl,
  currentUserId,
  otherUserName,
  timeLabel,
  isTranslationOpen,
  targetLanguage,
  playingAudioId,
  audioProgress,
  audioElapsed,
  onTogglePlayback,
  onOpenActions,
  onToggleReaction,
  onToggleTranslation,
  onCorrect,
  onCorrectionAccepted,
  onRetry,
}) => {
  const { t } = useTranslation();

  // System placeholder created by createConversationRoom — show as a
  // centered notice instead of a chat bubble.
  if (msg.message === "Conversation started") {
    return (
      <div className="system-notice">
        <span>{t("chatPage.conversationStarted") || "Conversation started"}</span>
      </div>
    );
  }

  const gap = position === "middle" || position === "last" ? "2px" : "8px";
  const isVoice = msg.messageType === "voice" || msg.media?.type === "voice";
  const isSticker = msg.messageType === "sticker";
  const isGif =
    msg.messageType === "gif" ||
    (typeof msg.message === "string" &&
      /\.gif(\?|$)|giphy\.com\/media/i.test(msg.message));
  const hasMedia = !!msg.media?.type && !isVoice;
  const isPlainText = !isSticker && !isGif && !isVoice && !hasMedia;
  const link = isPlainText && msg.message ? firstLink(msg.message) : null;

  const renderVoiceMessage = () => {
    const duration = msg.media?.duration || 0;
    const isPlaying = playingAudioId === msg._id;
    const bars = (msg.media?.waveform || Array(20).fill(0.3)).slice(0, 30);
    const playedCount = isPlaying ? Math.floor(audioProgress * bars.length) : 0;

    return (
      <div className="voice-message">
        <button
          className="voice-play-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (msg.media?.url) onTogglePlayback(msg._id, msg.media.url);
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="voice-waveform">
          <div className="voice-waveform-bars">
            {bars.map((v: number, i: number) => (
              <div
                key={i}
                className={`waveform-bar${i < playedCount ? " waveform-bar--played" : ""}`}
                style={{ height: `${Math.max(4, (v || 0.3) * 24)}px` }}
              />
            ))}
          </div>
        </div>
        <span className="voice-duration">
          {isPlaying ? formatDuration(audioElapsed) : formatDuration(duration)}
        </span>
      </div>
    );
  };

  const renderMediaContent = () => {
    if (!msg.media || !msg.media.type) return null;

    const mediaType = msg.media.type || msg.messageType;

    if (mediaType === "voice") {
      return renderVoiceMessage();
    }

    if (mediaType === "image" || msg.media.mimeType?.startsWith("image/")) {
      return (
        <div className="message-media">
          <img
            src={msg.media.url}
            alt="media"
            className="message-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      );
    }

    if (mediaType === "video" || msg.media.mimeType?.startsWith("video/")) {
      return (
        <div className="message-media">
          {msg.media.thumbnail ? (
            <div className="video-thumbnail-wrapper">
              <img
                src={msg.media.thumbnail}
                alt="video"
                className="message-image"
                loading="lazy"
                decoding="async"
              />
              <div className="video-play-overlay">
                <Play size={32} />
              </div>
            </div>
          ) : (
            <video src={msg.media.url} controls className="message-video" preload="metadata" />
          )}
        </div>
      );
    }

    // Document/file
    return (
      <div className="message-file">
        <Paperclip size={16} />
        <span className="file-name">{msg.media.fileName || "File"}</span>
        {msg.media.fileSize && (
          <span className="file-size">
            {(msg.media.fileSize / 1024).toFixed(0)}KB
          </span>
        )}
      </div>
    );
  };

  /**
   * Ticks, not words: one check once the server has the message
   * (`messageSent`), two once the other person's client has it
   * (`messageDelivered`), two marked read on `messagesRead`.
   */
  const renderStatusIcon = () => {
    if (msg.sender._id !== currentUserId) return null;

    const status = msg.status || "sent";

    if (status === "error") {
      return (
        <span className="status-text error" data-testid="msg-status-error">
          {t("chatPage.status.failed") || "Failed"}
        </span>
      );
    }

    if (status === "sending") {
      const label = t("chatPage.status.sending") || "Sending";
      return (
        <span
          className="message-status-icon sending"
          data-testid="msg-status-sending"
          role="img"
          aria-label={label}
          title={label}
        >
          <Clock size={13} />
        </span>
      );
    }

    const label =
      status === "read"
        ? t("chatPage.status.read") || "Read"
        : status === "delivered"
        ? t("chatPage.status.delivered") || "Delivered"
        : t("chatPage.status.sent") || "Sent";

    return (
      <span
        className={`message-status-icon ${status}`}
        data-testid={`msg-status-${status}`}
        role="img"
        aria-label={label}
        title={label}
      >
        {status === "sent" ? <Check size={13} /> : <CheckCheck size={13} />}
      </span>
    );
  };

  return (
    <div
      data-msg-id={msg._id}
      className={`modern-message ${isSent ? "sent" : "received"} ${
        msg.status === "error" ? "error" : ""
      }`}
      style={{ marginTop: isFirstInGroup ? "0" : gap }}
      onContextMenu={
        msg.isOptimistic
          ? undefined
          : (e) => {
              e.preventDefault();
              onOpenActions(msg);
            }
      }
    >
      {!isSent && (
        <div
          className="message-avatar"
          style={{ visibility: showAvatar ? "visible" : "hidden" }}
        >
          {(showAvatar || hideAvatarSpace) && (
            <img src={avatarUrl} alt={msg.sender.name} loading="lazy" decoding="async" />
          )}
        </div>
      )}

      <div className="message-wrapper">
        <div
          className={`message-bubble${isVoice ? " voice-bubble" : ""}${hasMedia ? " media-bubble" : ""}${isSticker ? " sticker-bubble" : ""}`}
          style={{
            borderRadius: getBubbleRadius(isSent, position),
          }}
        >
          {isSticker ? (
            <div className="sticker-message">{msg.message}</div>
          ) : isGif ? (
            <img
              className="gif-message"
              src={msg.message}
              alt={t("chatPage.gif.altText") || "GIF"}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <>
              {renderMediaContent()}

              {msg.replyTo && (
                <div className="reply-preview">
                  <span className="reply-sender">{msg.replyTo.sender.name}</span>
                  <span className="reply-text">{msg.replyTo.message}</span>
                </div>
              )}

              {msg.message && !isVoice && (
                <p className="message-text">{msg.message}</p>
              )}

              {/* A card for the first link in the message. Nothing is
                  fetched — the host and the URL are all the text itself
                  knows, and asking a third party for a title would leak
                  the conversation. */}
              {link && (
                <a
                  className="message-link-card"
                  data-testid="message-link-card"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="message-link-host">{link.host}</span>
                  <span className="message-link-url">{link.text}</span>
                </a>
              )}

              {isTranslationOpen && msg.message && (
                <TranslationCard
                  messageId={msg._id}
                  originalText={msg.message}
                  targetLanguage={targetLanguage}
                  onClose={() => onToggleTranslation(msg._id)}
                />
              )}
            </>
          )}

          <div className="message-meta">
            <span className="message-time">{timeLabel}</span>
            {isSent && <div className="message-status">{renderStatusIcon()}</div>}
          </div>
        </div>

        {/* Message-actions trigger (opens MessageActionMenu) */}
        {!msg.isOptimistic && (
          <button
            type="button"
            className="msg-action-trigger"
            aria-label={t("chatPage.moreOptions") || "More options"}
            onClick={() => onOpenActions(msg)}
          >
            <MoreVertical size={14} />
          </button>
        )}

        {/* Reactions row (renders null when there are none) */}
        <ReactionRow
          reactions={msg.reactions}
          myUserId={currentUserId || ""}
          onToggle={(emoji) => onToggleReaction(msg, emoji)}
        />

        {/* Correction card lives OUTSIDE the bubble so it always
            renders on a white background — readable for both
            sent (teal) and received (grey) bubbles. */}
        {msg.corrections && msg.corrections.length > 0 && (
          <CorrectionCard
            messageId={msg._id}
            correction={msg.corrections[0]}
            isMe={isSent}
            currentUserId={currentUserId || ""}
            otherUserName={otherUserName}
            onAccepted={(correctionId) => onCorrectionAccepted(msg._id, correctionId)}
          />
        )}

        {!isSent && !isSticker && !isVoice && !hasMedia && msg.message && (
          <div className="message-chip-row">
            {/* Hide Correct chip once a correction already exists */}
            {!(msg.corrections && msg.corrections.length > 0) && (
              <button
                type="button"
                className="correct-chip"
                onClick={() => onCorrect(msg)}
                title={t("chatPage.suggestCorrection") || "Suggest a correction"}
              >
                <Edit3 size={12} />
                <span>{t("chatPage.correct") || "Correct"}</span>
              </button>
            )}
            <button
              type="button"
              className={`translate-chip ${isTranslationOpen ? "active" : ""}`}
              onClick={() => onToggleTranslation(msg._id)}
              title={t("chatPage.translateThis") || "Translate this message"}
            >
              <Globe size={12} />
              <span>
                {isTranslationOpen
                  ? t("chatPage.hide_translation") || "Hide"
                  : t("chatPage.translate") || "Translate"}
              </span>
            </button>
          </div>
        )}

        {msg.status === "error" && (
          <button
            className="retry-btn"
            onClick={() => onRetry(msg)}
            title={t("chatPage.retrySending") || "Retry sending"}
          >
            <RefreshCw size={14} />
            <span>{t("chatPage.retry") || "Retry"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const MessageBubble = React.memo(MessageBubbleView);

export default MessageBubble;
