import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  BarChart3,
  Check,
  Hash,
  Image as ImageIcon,
  Link2,
  MessageCircleQuestion,
  Move,
  Plus,
  Trash2,
  Type,
  Video as VideoIcon,
  X,
} from "lucide-react";
import {
  useCreateStoryMutation,
  useCreateVideoStoryMutation,
  useGetVideoConfigQuery,
  useGetCloseFriendsQuery,
} from "../../store/slices/storiesSlice";
import { useSearchUsersQuery } from "../../store/slices/usersSlice";
import SurfaceCard from "../../design/SurfaceCard";
import notify from "../../design/notify";
import {
  LinkDraft,
  MentionDraft,
  MENTION_MAX_COUNT,
  newOverlayDraft,
  nextOverlayId,
  OverlayBgMode,
  OverlayDraft,
  OverlayFontStyle,
  OVERLAY_BG_CLASS,
  OVERLAY_BG_MODES,
  OVERLAY_COLORS,
  OVERLAY_FONT_CLASS,
  OVERLAY_FONT_STYLES,
  OVERLAY_MAX_COUNT,
  OVERLAY_SCALE_STEPS,
  clamp01,
  formatMegabytes,
  overlayPositionStyle,
  overlayScaleClass,
  parseLinkUrl,
  serializeLink,
  serializeMentions,
  serializeOverlays,
  videoConstraintsOf,
  videoDurationError,
  videoFileError,
} from "./storyOverlays";

/**
 * The story composer.
 *
 * What changed in Phase 2 is not the buttons but what leaves the page: text and
 * emoji stickers, tagged people and the link sticker now travel as STRUCTURED
 * JSON (`overlays`, `mentions`, `link`) in the shape `controllers/stories.js`
 * parses, instead of being dropped on the floor as they were before. Nothing is
 * baked into the image — the app's studio uploads the same JSON, so a story
 * composed here is legible there and the wire format is the contract, not the
 * pixels. Drawing and filters, which the app DOES bake client-side, are out of
 * scope: a canvas editor is its own project.
 *
 * Positions are normalized here and only here (see `storyOverlays.ts`): the
 * canvas is whatever size the viewport gives it, so fractions are the only
 * placement that survives the trip to a 1080x1920 phone.
 */

type Step = "media" | "edit";
type StickerPanel = "poll" | "question" | "hashtag" | "mention" | "link" | null;

const PAGE = "min-h-screen bg-canvas px-4 py-6 dark:bg-canvas-dark";
const COLUMN = "mx-auto w-full max-w-3xl space-y-4";
const FIELD = [
  "w-full rounded-card border border-line bg-surface px-3 py-2 text-sm",
  "text-ink-900 placeholder:text-ink-400",
  "dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-50",
].join(" ");
const PRIMARY = [
  "inline-flex items-center gap-1.5 rounded-chip bg-brand-deep px-3.5 py-1.5 text-sm font-semibold text-white",
  "transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");
const GHOST = [
  "inline-flex items-center gap-1.5 rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700",
  "transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50",
  "dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800",
].join(" ");
const TOOL = [
  "flex flex-1 flex-col items-center gap-1.5 rounded-card border border-line px-3 py-4 text-sm font-medium",
  "text-ink-700 transition hover:bg-ink-100",
  "dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800",
].join(" ");
const LABEL = "text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400";
const SELECT = [
  "rounded-chip border border-line bg-surface px-2 py-1 text-xs text-ink-800",
  "dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-100",
].join(" ");

/** The quick emoji row. These are story CONTENT — the character the author
 * places on the picture — not icons standing in for an action. */
const QUICK_EMOJI = ["😂", "❤️", "🔥", "🎉", "👏", "😮"];

const BG_COLORS = OVERLAY_COLORS.map((c) => c.hex);

const CreateStory: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("media");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image");
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Text story body (distinct from the overlay vocabulary: this is the
  // centered caption the backend stores on `text`/`fontStyle`).
  const [text, setText] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontStyle, setFontStyle] = useState<"normal" | "bold" | "italic" | "handwriting">("normal");

  const [privacy, setPrivacy] = useState<"public" | "friends" | "close_friends">("public");

  const [overlays, setOverlays] = useState<OverlayDraft[]>([]);
  const [mentions, setMentions] = useState<MentionDraft[]>([]);
  const [link, setLink] = useState<LinkDraft>({ url: "", title: "", displayText: "" });
  const [linkOn, setLinkOn] = useState(false);

  const [panel, setPanel] = useState<StickerPanel>(null);
  const [mentionQuery, setMentionQuery] = useState("");

  const [poll, setPoll] = useState<{ question: string; options: string[]; isAnonymous: boolean } | null>(null);
  const [questionBox, setQuestionBox] = useState<{ prompt: string } | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: "overlay" | "mention"; index: number } | null>(null);

  const [createStory, { isLoading: isCreating }] = useCreateStoryMutation();
  const [createVideoStory, { isLoading: isCreatingVideo }] = useCreateVideoStoryMutation();

  // Public endpoint, and the numbers are server constants — the slice keeps
  // them for ten minutes, so opening the composer twice costs one request.
  const { data: videoConfigData } = useGetVideoConfigQuery(undefined);
  const videoLimits = useMemo(() => videoConstraintsOf(videoConfigData), [videoConfigData]);

  // Only asked for once the author actually chooses close friends: an empty
  // list is the one thing worth interrupting them about, and a story posted to
  // nobody is the failure this prevents.
  const { data: closeFriendsData } = useGetCloseFriendsQuery(undefined, {
    skip: privacy !== "close_friends",
  });
  const closeFriendsCount = useMemo(() => {
    const payload = closeFriendsData as any;
    if (!payload) return null;
    const list = Array.isArray(payload) ? payload : payload.data;
    return Array.isArray(list) ? list.length : null;
  }, [closeFriendsData]);

  const mentionSearch = mentionQuery.trim();
  const { data: searchData, isFetching: isSearching } = useSearchUsersQuery(
    { query: mentionSearch, limit: 8 },
    { skip: mentionSearch.length < 2 }
  );
  const searchResults = useMemo(() => {
    const payload = searchData as any;
    if (!payload) return [];
    const list = Array.isArray(payload) ? payload : payload.data;
    return Array.isArray(list) ? list : [];
  }, [searchData]);

  useEffect(
    () => () => {
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    },
    // Runs on unmount only: revoking on every preview change would kill the
    // <img> currently on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetMedia = useCallback(() => {
    setMediaFiles([]);
    setMediaPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setCurrentMediaIndex(0);
    setStep("media");
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (files.length === 0) return;
      setMediaError(null);

      const images = files.filter((f) => f.type.indexOf("image/") === 0);
      const videos = files.filter((f) => f.type.indexOf("video/") === 0);

      if (videos.length > 0) {
        // Checked BEFORE the editor opens: composing a story on top of a file
        // the server will refuse wastes the only part of this that is work.
        const reason = videoFileError(videos[0], videoLimits);
        if (reason === "type") {
          setMediaError(t("stories.video_type_error") || "That video format isn't supported");
          return;
        }
        if (reason === "size") {
          setMediaError(
            (t("stories.video_size_error") || "That video is larger than") +
              " " +
              formatMegabytes(videoLimits)
          );
          return;
        }
        setMediaType("video");
        setMediaFiles(videos.slice(0, 1));
        setMediaPreviews(videos.slice(0, 1).map((file) => URL.createObjectURL(file)));
        setStep("edit");
        return;
      }

      if (images.length > 0) {
        setMediaType("image");
        setMediaFiles(images.slice(0, 5));
        setMediaPreviews(images.slice(0, 5).map((file) => URL.createObjectURL(file)));
        setStep("edit");
      }
    },
    [t, videoLimits]
  );

  /** Duration is the one constraint the browser only learns after it has read
   * the file's header, so it is enforced here rather than at selection. */
  const handleVideoMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const seconds = e.currentTarget.duration;
      if (videoDurationError(seconds, videoLimits)) {
        setMediaError(
          (t("stories.video_duration_error") || "That video is longer than") +
            " " +
            (videoLimits && videoLimits.maxDurationFormatted ? videoLimits.maxDurationFormatted : "")
        );
        resetMedia();
      }
    },
    [resetMedia, t, videoLimits]
  );

  // ---------------------------------------------------------------- overlays

  const addOverlay = useCallback(
    (partial: Partial<OverlayDraft>) => {
      setOverlays((prev) =>
        prev.length >= OVERLAY_MAX_COUNT ? prev : prev.concat([newOverlayDraft(partial)])
      );
    },
    []
  );

  const patchOverlay = useCallback((index: number, patch: Partial<OverlayDraft>) => {
    setOverlays((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }, []);

  const removeOverlay = useCallback((index: number) => {
    setOverlays((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---------------------------------------------------------------- mentions

  const addMention = useCallback((user: { _id: string; name?: string }) => {
    setMentions((prev) => {
      if (prev.length >= MENTION_MAX_COUNT) return prev;
      if (prev.some((m) => m.userId === user._id)) return prev;
      // Same default spot as the app's mention sheet (x 50 / y 80 on its
      // 0-100 scale), then draggable from there.
      return prev.concat([
        { id: nextOverlayId("mn"), userId: user._id, name: user.name || "", x: 0.5, y: 0.8 },
      ]);
    });
  }, []);

  const removeMention = useCallback((index: number) => {
    setMentions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ------------------------------------------------------------------ drag

  const pointFrom = (e: React.PointerEvent): { x: number; y: number } | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const startDrag = (kind: "overlay" | "mention", index: number) => (
    e: React.PointerEvent<HTMLElement>
  ) => {
    dragRef.current = { kind, index };
    const target = e.currentTarget as any;
    // Pointer capture is what makes one handler serve mouse, pen and touch:
    // the moves keep arriving at this node even when the finger outruns it.
    // jsdom has no implementation, hence the guard.
    if (target && typeof target.setPointerCapture === "function") {
      try {
        target.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture is an optimisation, never a requirement */
      }
    }
  };

  const onDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFrom(e);
    if (!point) return;
    if (drag.kind === "overlay") {
      setOverlays((prev) => prev.map((o, i) => (i === drag.index ? { ...o, x: point.x, y: point.y } : o)));
    } else {
      setMentions((prev) => prev.map((m, i) => (i === drag.index ? { ...m, x: point.x, y: point.y } : m)));
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    const target = e.currentTarget as any;
    if (target && typeof target.releasePointerCapture === "function") {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* nothing to release */
      }
    }
  };

  // --------------------------------------------------------------- stickers

  const openPoll = useCallback(() => {
    // Poll XOR question, enforced here rather than at submit: the backend
    // returns 400 for both at once, and a composer that lets you build the
    // second one only to reject it has wasted the author's time.
    setQuestionBox(null);
    setPoll({ question: "", options: ["", ""], isAnonymous: false });
    setPanel("poll");
  }, []);

  const openQuestion = useCallback(() => {
    setPoll(null);
    setQuestionBox({ prompt: t("stories.question_box.ask_me_anything") || "Ask me anything!" });
    setPanel("question");
  }, [t]);

  const addHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, "").toLowerCase();
    if (tag && hashtags.indexOf(tag) === -1 && hashtags.length < 10) {
      setHashtags(hashtags.concat([tag]));
    }
    setHashtagInput("");
  }, [hashtagInput, hashtags]);

  const linkInvalid = linkOn && link.url.trim().length > 0 && !parseLinkUrl(link.url);

  // ----------------------------------------------------------------- submit

  const handleSubmit = useCallback(async () => {
    if (mediaType === "text" && !text.trim() && overlays.length === 0) {
      notify.error(t("stories.add_text") || "Please add text to your story");
      return;
    }
    if (mediaType !== "text" && mediaFiles.length === 0) {
      notify.error(t("stories.upload_media") || "Please upload media");
      return;
    }
    if (linkInvalid) {
      notify.error(t("stories.link_invalid") || "That link doesn't look right");
      return;
    }

    const formData = new FormData();
    if (mediaType === "video") {
      if (mediaFiles[0]) formData.append("video", mediaFiles[0]);
    } else if (mediaType !== "text") {
      mediaFiles.forEach((file) => formData.append("media", file));
    }

    if (mediaType === "text") {
      formData.append("text", text);
      formData.append("backgroundColor", backgroundColor);
      formData.append("textColor", textColor);
      formData.append("fontStyle", fontStyle);
    }

    formData.append("privacy", privacy);

    const serializedOverlays = serializeOverlays(overlays);
    if (serializedOverlays.length > 0) {
      formData.append("overlays", JSON.stringify(serializedOverlays));
    }

    const serializedMentions = serializeMentions(mentions);
    if (serializedMentions.length > 0) {
      formData.append("mentions", JSON.stringify(serializedMentions));
    }

    const serializedLink = linkOn ? serializeLink(link) : null;
    if (serializedLink) formData.append("link", JSON.stringify(serializedLink));

    if (poll && poll.question && poll.options.filter((o) => o.trim()).length >= 2) {
      formData.append(
        "poll",
        JSON.stringify({
          question: poll.question,
          options: poll.options.filter((o) => o.trim()),
          isAnonymous: poll.isAnonymous,
        })
      );
    } else if (questionBox && questionBox.prompt) {
      formData.append("questionBox", JSON.stringify(questionBox));
    }

    if (hashtags.length > 0) formData.append("hashtags", JSON.stringify(hashtags));

    try {
      if (mediaType === "video") {
        await createVideoStory(formData).unwrap();
      } else {
        await createStory(formData).unwrap();
      }
      notify.success(t("stories.story_created") || "Story shared");
      navigate("/moments");
    } catch (error: any) {
      notify.error(
        (error && error.data && error.data.error) ||
          t("stories.create_story_failed") ||
          "Couldn't share your story"
      );
    }
  }, [
    backgroundColor,
    createStory,
    createVideoStory,
    fontStyle,
    hashtags,
    link,
    linkInvalid,
    linkOn,
    mediaFiles,
    mediaType,
    mentions,
    navigate,
    overlays,
    poll,
    privacy,
    questionBox,
    t,
    text,
    textColor,
  ]);

  const handleClose = useCallback(() => {
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    navigate("/moments");
  }, [mediaPreviews, navigate]);

  // ------------------------------------------------------------------ views

  const videoHint = videoLimits ? (
    <p data-testid="video-constraints" className="text-xs text-ink-500 dark:text-ink-400">
      {t("stories.video_limits") || "Video"}:{" "}
      {videoLimits.maxDurationFormatted || ""} · {formatMegabytes(videoLimits)} ·{" "}
      {(videoLimits.allowedTypes || []).join(", ")}
    </p>
  ) : null;

  const renderCanvasBackground = () => {
    if (mediaType === "text") {
      return (
        <div
          // Author data, not theme: the colours they picked for this story.
          style={{ backgroundColor, color: textColor }}
          className="flex h-full w-full items-center justify-center p-6 text-center text-lg font-semibold"
        >
          {text}
        </div>
      );
    }
    const preview = mediaPreviews[currentMediaIndex];
    if (!preview) return <div className="h-full w-full bg-ink-800" />;
    if (mediaType === "video") {
      return (
        <video
          data-testid="story-video-preview"
          src={preview}
          className="h-full w-full object-cover"
          onLoadedMetadata={handleVideoMetadata}
          muted
          playsInline
          controls
        />
      );
    }
    return <img src={preview} alt="" className="h-full w-full object-cover" />;
  };

  return (
    <div className={PAGE}>
      <div className={COLUMN}>
        <header className="flex items-center justify-between gap-3">
          <button type="button" className={GHOST} onClick={handleClose} data-testid="close-composer">
            <X size={16} aria-hidden />
            {t("stories.cancel") || "Cancel"}
          </button>
          <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50">
            {t("stories.create_first_story") || "Create story"}
          </h1>
          {step === "edit" ? (
            <button
              type="button"
              data-testid="share-story"
              className={PRIMARY}
              onClick={handleSubmit}
              disabled={isCreating || isCreatingVideo}
            >
              <Check size={16} aria-hidden />
              {t("stories.share_story") || "Share"}
            </button>
          ) : (
            <span className="w-20" />
          )}
        </header>

        {mediaError && (
          <p
            data-testid="media-error"
            role="alert"
            className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {mediaError}
          </p>
        )}

        {step === "media" ? (
          <SurfaceCard padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className={TOOL} data-testid="pick-photo" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <ImageIcon size={20} aria-hidden />
                {t("stories.choose_photo") || "Photo"}
              </button>
              <button type="button" className={TOOL} data-testid="pick-video" onClick={() => videoInputRef.current && videoInputRef.current.click()}>
                <VideoIcon size={20} aria-hidden />
                {t("stories.choose_video") || "Video"}
              </button>
              <button
                type="button"
                className={TOOL}
                data-testid="pick-text"
                onClick={() => {
                  setMediaType("text");
                  setStep("edit");
                }}
              >
                <Type size={20} aria-hidden />
                {t("stories.text_story") || "Text"}
              </button>
            </div>
            <div className="mt-3">{videoHint}</div>
            <input
              ref={fileInputRef}
              data-testid="photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              data-testid="video-input"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </SurfaceCard>
        ) : (
          <div className="space-y-4">
            {/* The canvas. Overlays and mentions live OUTSIDE the background
                element so nothing is ever flattened into the picture. */}
            <div
              ref={canvasRef}
              data-testid="story-canvas"
              className="relative mx-auto aspect-[9/16] w-full max-w-xs touch-none overflow-hidden rounded-card bg-black"
            >
              {renderCanvasBackground()}

              {overlays.map((overlay, index) => (
                <span
                  key={overlay.id}
                  data-testid={"overlay-node-" + index}
                  role="button"
                  tabIndex={0}
                  aria-label={t("stories.move_sticker") || "Move sticker"}
                  onPointerDown={startDrag("overlay", index)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  // The two numbers out of the JSON. Nothing else here is
                  // inline: font, weight, plate and size are all classes.
                  style={{
                    ...overlayPositionStyle(overlay.x, overlay.y),
                    color: overlay.color,
                  }}
                  className={[
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-pre-wrap text-center leading-tight",
                    overlayScaleClass(overlay.scale),
                    OVERLAY_FONT_CLASS[overlay.fontStyle],
                    OVERLAY_BG_CLASS[overlay.bgMode],
                  ].join(" ")}
                >
                  {overlay.content || (t("stories.tap_to_type") || "Tap to type")}
                </span>
              ))}

              {mentions.map((mention, index) => (
                <span
                  key={mention.id}
                  data-testid={"mention-node-" + index}
                  role="button"
                  tabIndex={0}
                  aria-label={t("stories.move_sticker") || "Move sticker"}
                  onPointerDown={startDrag("mention", index)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={overlayPositionStyle(mention.x, mention.y)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none rounded-chip bg-white/85 px-2 py-0.5 text-xs font-semibold text-ink-900"
                >
                  @{mention.name}
                </span>
              ))}

              {linkOn && parseLinkUrl(link.url) && (
                <span
                  data-testid="link-sticker-preview"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-chip bg-white/85 px-2.5 py-1 text-xs font-semibold text-ink-900"
                >
                  {link.displayText.trim() || parseLinkUrl(link.url)!.host}
                </span>
              )}
            </div>

            {/* Text story body */}
            {mediaType === "text" && (
              <SurfaceCard padding="md">
                <label className={LABEL} htmlFor="story-text-field">
                  {t("stories.story_text") || "Story text"}
                </label>
                <textarea
                  id="story-text-field"
                  data-testid="story-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2200}
                  rows={3}
                  placeholder={t("stories.add_text") || "Type your story…"}
                  className={FIELD + " mt-1"}
                />
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div>
                    <p className={LABEL}>{t("stories.background") || "Background"}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {OVERLAY_COLORS.map((color, i) => (
                        <button
                          key={color.hex}
                          type="button"
                          aria-label={t("stories.background") || "Background"}
                          data-testid={"bg-color-" + i}
                          onClick={() => setBackgroundColor(BG_COLORS[i])}
                          className={
                            "h-6 w-6 rounded-full border border-line " +
                            color.swatch +
                            (backgroundColor === color.hex ? " ring-2 ring-brand-deep" : "")
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={LABEL}>{t("stories.text_color") || "Text"}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {OVERLAY_COLORS.map((color, i) => (
                        <button
                          key={color.hex}
                          type="button"
                          aria-label={t("stories.text_color") || "Text"}
                          data-testid={"text-color-" + i}
                          onClick={() => setTextColor(color.hex)}
                          className={
                            "h-6 w-6 rounded-full border border-line " +
                            color.swatch +
                            (textColor === color.hex ? " ring-2 ring-brand-deep" : "")
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={LABEL}>{t("stories.font_style") || "Font"}</p>
                    <select
                      data-testid="story-font"
                      className={SELECT + " mt-1"}
                      value={fontStyle}
                      onChange={(e) => setFontStyle(e.target.value as any)}
                    >
                      {(["normal", "bold", "italic", "handwriting"] as const).map((s) => (
                        <option key={s} value={s}>
                          {t("stories.font." + s) || s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </SurfaceCard>
            )}

            {/* Overlays */}
            <SurfaceCard padding="md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={LABEL}>{t("stories.stickers_text") || "Text & emoji"}</p>
                <span className="text-xs text-ink-500 dark:text-ink-400">
                  {overlays.length}/{OVERLAY_MAX_COUNT}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="add-text-overlay"
                  className={GHOST}
                  disabled={overlays.length >= OVERLAY_MAX_COUNT}
                  onClick={() => addOverlay({ type: "text" })}
                >
                  <Plus size={16} aria-hidden />
                  {t("stories.add_text_sticker") || "Add text"}
                </button>
                {QUICK_EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    data-testid={"add-emoji-" + emoji}
                    aria-label={t("stories.add_emoji_sticker") || "Add emoji"}
                    disabled={overlays.length >= OVERLAY_MAX_COUNT}
                    className={
                      "rounded-chip border border-line px-2 py-1 text-base transition hover:bg-ink-100 disabled:opacity-50 dark:border-line-dark dark:hover:bg-ink-800"
                    }
                    onClick={() => addOverlay({ type: "emoji", content: emoji, scale: 1.5 })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <ul className="mt-3 space-y-2">
                {overlays.map((overlay, index) => (
                  <li
                    key={overlay.id}
                    className="rounded-card border border-line p-2 dark:border-line-dark"
                  >
                    <div className="flex items-center gap-2">
                      <Move size={14} aria-hidden className="shrink-0 text-ink-400" />
                      <input
                        data-testid={"overlay-content-" + index}
                        value={overlay.content}
                        maxLength={500}
                        aria-label={t("stories.sticker_text") || "Sticker text"}
                        onChange={(e) => patchOverlay(index, { content: e.target.value })}
                        className={FIELD}
                      />
                      <button
                        type="button"
                        data-testid={"overlay-delete-" + index}
                        aria-label={t("stories.remove") || "Remove"}
                        onClick={() => removeOverlay(index)}
                        className="shrink-0 rounded-full p-1.5 text-ink-500 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        data-testid={"overlay-font-" + index}
                        aria-label={t("stories.font_style") || "Font"}
                        className={SELECT}
                        value={overlay.fontStyle}
                        onChange={(e) =>
                          patchOverlay(index, { fontStyle: e.target.value as OverlayFontStyle })
                        }
                      >
                        {OVERLAY_FONT_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {t("stories.font." + s) || s}
                          </option>
                        ))}
                      </select>
                      <select
                        data-testid={"overlay-bg-" + index}
                        aria-label={t("stories.sticker_background") || "Background"}
                        className={SELECT}
                        value={overlay.bgMode}
                        onChange={(e) =>
                          patchOverlay(index, { bgMode: e.target.value as OverlayBgMode })
                        }
                      >
                        {OVERLAY_BG_MODES.map((m) => (
                          <option key={m} value={m}>
                            {t("stories.bg_mode." + m) || m}
                          </option>
                        ))}
                      </select>
                      <select
                        data-testid={"overlay-scale-" + index}
                        aria-label={t("stories.sticker_size") || "Size"}
                        className={SELECT}
                        value={String(overlay.scale)}
                        onChange={(e) => patchOverlay(index, { scale: Number(e.target.value) })}
                      >
                        {OVERLAY_SCALE_STEPS.map((s) => (
                          <option key={s} value={String(s)}>
                            {s}x
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-1">
                        {OVERLAY_COLORS.map((color, ci) => (
                          <button
                            key={color.hex}
                            type="button"
                            data-testid={"overlay-color-" + index + "-" + ci}
                            aria-label={t("stories.sticker_color") || "Colour"}
                            onClick={() => patchOverlay(index, { color: color.hex })}
                            className={
                              "h-5 w-5 rounded-full border border-line " +
                              color.swatch +
                              (overlay.color === color.hex ? " ring-2 ring-brand-deep" : "")
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </SurfaceCard>

            {/* Stickers: mentions, link, poll XOR question, hashtags */}
            <SurfaceCard padding="md">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="open-mentions"
                  className={GHOST}
                  onClick={() => setPanel(panel === "mention" ? null : "mention")}
                >
                  <AtSign size={16} aria-hidden />
                  {t("stories.mention") || "Mention"}
                </button>
                <button
                  type="button"
                  data-testid="open-link"
                  className={GHOST}
                  onClick={() => {
                    setLinkOn(true);
                    setPanel(panel === "link" ? null : "link");
                  }}
                >
                  <Link2 size={16} aria-hidden />
                  {t("stories.link") || "Link"}
                </button>
                <button type="button" data-testid="open-poll" className={GHOST} onClick={openPoll}>
                  <BarChart3 size={16} aria-hidden />
                  {t("stories.poll") || "Poll"}
                </button>
                <button
                  type="button"
                  data-testid="open-question"
                  className={GHOST}
                  onClick={openQuestion}
                >
                  <MessageCircleQuestion size={16} aria-hidden />
                  {t("stories.question") || "Question"}
                </button>
                <button
                  type="button"
                  data-testid="open-hashtag"
                  className={GHOST}
                  onClick={() => setPanel(panel === "hashtag" ? null : "hashtag")}
                >
                  <Hash size={16} aria-hidden />
                  {t("stories.hashtag") || "Hashtag"}
                </button>
              </div>

              {panel === "mention" && (
                <div className="mt-3 space-y-2">
                  <input
                    data-testid="mention-search"
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    placeholder={t("stories.search_people") || "Search people"}
                    aria-label={t("stories.search_people") || "Search people"}
                    className={FIELD}
                  />
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {mentions.length}/{MENTION_MAX_COUNT}
                  </p>
                  {isSearching && (
                    <p className="text-xs text-ink-500">{t("stories.loading") || "Loading…"}</p>
                  )}
                  <ul className="space-y-1">
                    {searchResults.map((user: any) => (
                      <li key={user._id}>
                        <button
                          type="button"
                          data-testid={"mention-result-" + user._id}
                          disabled={
                            mentions.length >= MENTION_MAX_COUNT ||
                            mentions.some((m) => m.userId === user._id)
                          }
                          onClick={() => addMention(user)}
                          className={GHOST + " w-full justify-start"}
                        >
                          @{user.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <ul className="flex flex-wrap gap-1.5">
                    {mentions.map((mention, index) => (
                      <li key={mention.id}>
                        <button
                          type="button"
                          data-testid={"mention-remove-" + index}
                          onClick={() => removeMention(index)}
                          className={GHOST}
                        >
                          @{mention.name}
                          <X size={12} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {panel === "link" && (
                <div className="mt-3 space-y-2">
                  <input
                    data-testid="link-url"
                    type="url"
                    value={link.url}
                    onChange={(e) => setLink({ ...link, url: e.target.value })}
                    placeholder="https://example.com"
                    aria-label={t("stories.link_url") || "Link URL"}
                    className={FIELD}
                  />
                  {linkInvalid && (
                    <p data-testid="link-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {t("stories.link_invalid") || "Enter a full http:// or https:// address"}
                    </p>
                  )}
                  <input
                    data-testid="link-title"
                    value={link.title}
                    onChange={(e) => setLink({ ...link, title: e.target.value })}
                    placeholder={t("stories.link_title") || "Title"}
                    aria-label={t("stories.link_title") || "Title"}
                    className={FIELD}
                  />
                  <input
                    data-testid="link-display"
                    value={link.displayText}
                    maxLength={30}
                    onChange={(e) => setLink({ ...link, displayText: e.target.value })}
                    placeholder={t("stories.link_label") || "Sticker label"}
                    aria-label={t("stories.link_label") || "Sticker label"}
                    className={FIELD}
                  />
                  <button
                    type="button"
                    data-testid="remove-link"
                    className={GHOST}
                    onClick={() => {
                      setLinkOn(false);
                      setLink({ url: "", title: "", displayText: "" });
                      setPanel(null);
                    }}
                  >
                    <Trash2 size={16} aria-hidden />
                    {t("stories.remove") || "Remove"}
                  </button>
                </div>
              )}

              {panel === "poll" && poll && (
                <div className="mt-3 space-y-2">
                  <input
                    data-testid="poll-question"
                    value={poll.question}
                    onChange={(e) => setPoll({ ...poll, question: e.target.value })}
                    placeholder={t("stories.poll_question") || "Ask something"}
                    aria-label={t("stories.poll_question") || "Ask something"}
                    className={FIELD}
                  />
                  {poll.options.map((option, index) => (
                    <input
                      key={index}
                      data-testid={"poll-option-" + index}
                      value={option}
                      onChange={(e) => {
                        const options = poll.options.slice();
                        options[index] = e.target.value;
                        setPoll({ ...poll, options });
                      }}
                      aria-label={(t("stories.poll_option") || "Option") + " " + (index + 1)}
                      className={FIELD}
                    />
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={GHOST}
                      onClick={() => setPoll({ ...poll, options: poll.options.concat([""]) })}
                    >
                      <Plus size={16} aria-hidden />
                      {t("stories.add_option") || "Add option"}
                    </button>
                    <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                      <input
                        type="checkbox"
                        checked={poll.isAnonymous}
                        onChange={(e) => setPoll({ ...poll, isAnonymous: e.target.checked })}
                      />
                      {t("stories.anonymous_voting") || "Anonymous voting"}
                    </label>
                    <button
                      type="button"
                      data-testid="remove-poll"
                      className={GHOST}
                      onClick={() => {
                        setPoll(null);
                        setPanel(null);
                      }}
                    >
                      <Trash2 size={16} aria-hidden />
                      {t("stories.remove") || "Remove"}
                    </button>
                  </div>
                </div>
              )}

              {panel === "question" && questionBox && (
                <div className="mt-3 space-y-2">
                  <input
                    data-testid="question-prompt"
                    value={questionBox.prompt}
                    onChange={(e) => setQuestionBox({ prompt: e.target.value })}
                    aria-label={t("stories.question_prompt") || "Question prompt"}
                    className={FIELD}
                  />
                  <button
                    type="button"
                    data-testid="remove-question"
                    className={GHOST}
                    onClick={() => {
                      setQuestionBox(null);
                      setPanel(null);
                    }}
                  >
                    <Trash2 size={16} aria-hidden />
                    {t("stories.remove") || "Remove"}
                  </button>
                </div>
              )}

              {panel === "hashtag" && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      data-testid="hashtag-input"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addHashtag();
                        }
                      }}
                      placeholder="#hashtag"
                      aria-label={t("stories.hashtag") || "Hashtag"}
                      className={FIELD}
                    />
                    <button type="button" data-testid="add-hashtag" className={GHOST} onClick={addHashtag}>
                      <Plus size={16} aria-hidden />
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {hashtags.map((tag) => (
                      <li key={tag}>
                        <button
                          type="button"
                          className={GHOST}
                          onClick={() => setHashtags(hashtags.filter((h) => h !== tag))}
                        >
                          #{tag}
                          <X size={12} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SurfaceCard>

            {/* Privacy */}
            <SurfaceCard padding="md">
              {/* `stories.audience`, not `stories.privacy`: the latter is
                  already an OBJECT in this namespace (public / friends /
                  close_friends below), and i18next cannot hold a string and a
                  subtree at the same path. */}
              <label className={LABEL} htmlFor="story-privacy">
                {t("stories.audience") || "Who can see this"}
              </label>
              <select
                id="story-privacy"
                data-testid="privacy-select"
                className={FIELD + " mt-1"}
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as any)}
              >
                <option value="public">{t("stories.privacy.public") || "Everyone"}</option>
                <option value="friends">{t("stories.privacy.friends") || "Friends"}</option>
                <option value="close_friends">
                  {t("stories.privacy.close_friends") || "Close friends"}
                </option>
              </select>
              {privacy === "close_friends" && closeFriendsCount === 0 && (
                <p className="mt-2 text-xs text-ink-600 dark:text-ink-300">
                  {t("stories.close_friends_empty") ||
                    "Your close friends list is empty — nobody would see this story."}{" "}
                  <Link
                    data-testid="close-friends-hint"
                    to="/settings/close-friends"
                    className="font-semibold text-brand-deep underline"
                  >
                    {t("stories.manage_close_friends") || "Manage close friends"}
                  </Link>
                </p>
              )}
            </SurfaceCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStory;
