import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import DialogShell from "../../design/DialogShell";
import { Story } from "./types";
import { storiesOf, mediaOf } from "./highlightStories";

export interface HighlightStoryViewerProps {
  /** The highlight as `GET /stories/highlights/user/:id` returns it. */
  highlight: any;
  /** Whose profile the rail is on. A highlight's stories carry no `user`. */
  authorName?: string;
  onClose: () => void;
}

const TITLE_ID = "highlight-story-title";

const CONTAINER = "fixed inset-0 z-[80] flex items-center justify-center bg-ink-950 p-0";
const PANEL = "relative flex h-full w-full max-w-md flex-col bg-ink-950";
const ARROW = [
  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white",
  "backdrop-blur transition hover:bg-white/25 disabled:opacity-30",
].join(" ");

/**
 * A highlight's stories, full screen.
 *
 * Deliberately NOT `StoryViewer`. That component is a route (`/stories/:userId`)
 * keyed by author: it reads `useParams`, fetches `GET /stories/user/:userId`
 * and drives replies, reactions, polls and owner tools off `story.user._id`.
 * A highlight's stories arrive already fetched, from a projection that has no
 * `user` on them at all (see `highlightStories.ts`), so feeding them through
 * that component would mean either a new prop path across every one of those
 * branches or a viewer whose reply box posts to `undefined`.
 *
 * What a highlight needs is the smaller half of the viewer: the media, a
 * position, and a way forward and back. That is this file. Progress timers,
 * hold-to-pause and the reply rail stay where they belong -- a highlight is
 * browsed, not watched on a clock.
 */
const HighlightStoryViewer: React.FC<HighlightStoryViewerProps> = ({
  highlight,
  authorName,
  onClose,
}) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const stories: Story[] = storiesOf(highlight);
  const total = stories.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const story: any = stories[safeIndex];
  const media = mediaOf(story);

  const go = (delta: number) => {
    const next = safeIndex + delta;
    if (next < 0 || next >= total) {
      if (next >= total) onClose();
      return;
    }
    setIndex(next);
  };

  return (
    <DialogShell
      labelledBy={TITLE_ID}
      onClose={onClose}
      testId="highlight-story-viewer"
      backdropTestId="highlight-story-backdrop"
      containerClassName={CONTAINER}
      panelClassName={PANEL}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        {/* One segment per story, the viewer's own vocabulary for "where am I". */}
        <div className="flex flex-1 gap-1" aria-hidden>
          {stories.map((item: any, i: number) => (
            <span
              key={item._id}
              className={`h-0.5 flex-1 rounded-full ${
                i <= safeIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <span
          data-testid="highlight-story-position"
          className="shrink-0 text-xs font-semibold text-white/80"
        >
          {`${safeIndex + 1}/${total}`}
        </span>
        <button
          type="button"
          data-testid="highlight-story-close"
          onClick={onClose}
          aria-label={t("stories.close") || "Close"}
          className="shrink-0 rounded-full p-1.5 text-white/80 transition hover:bg-white/15"
        >
          <X size={20} />
        </button>
      </div>

      <h2 id={TITLE_ID} className="px-4 pb-2 text-sm font-semibold text-white">
        {(highlight && highlight.title) || t("stories.highlights_title") || "Highlights"}
        {authorName ? (
          <span className="pl-2 font-normal text-white/60">{authorName}</span>
        ) : null}
      </h2>

      <div className="relative min-h-0 flex-1">
        {media ? (
          <img
            data-testid="highlight-story-image"
            src={media}
            alt={(highlight && highlight.title) || ""}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            data-testid="highlight-story-text"
            // Data-driven: the colours are the ones the author picked when the
            // story was written, so they cannot come from a utility class.
            style={{
              backgroundColor: (story && story.backgroundColor) || undefined,
              color: (story && story.textColor) || undefined,
            }}
            className="flex h-full w-full items-center justify-center bg-ink-900 p-8 text-center text-lg font-semibold text-white"
          >
            {(story && story.text) || ""}
          </div>
        )}

        <button
          type="button"
          data-testid="highlight-story-prev"
          onClick={() => go(-1)}
          disabled={safeIndex === 0}
          aria-label={t("stories.previous") || "Previous"}
          className={`${ARROW} left-3`}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          data-testid="highlight-story-next"
          onClick={() => go(1)}
          aria-label={t("stories.next") || "Next"}
          className={`${ARROW} right-3`}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </DialogShell>
  );
};

export default HighlightStoryViewer;
