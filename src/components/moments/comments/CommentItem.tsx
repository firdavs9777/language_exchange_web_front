import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaRegSmile, FaRegTrashAlt, FaReply } from "react-icons/fa";
import { Avatar, SurfaceCard, Badge } from "../../../design";
import { aggregateReactions } from "../../chat/actions/ReactionRow";
import MomentReactionRow from "../actions/MomentReactionRow";
import TranslatableText from "../TranslatableText";
import CommentComposer from "./CommentComposer";
import RepliesThread from "./RepliesThread";
import { CommentType } from "./types";
import {
  useDeleteMomentCommentMutation,
  useLikeCommentMutation,
  useReactToCommentMutation,
  useTranslateCommentMutation,
  useUnreactToCommentMutation,
} from "../../../store/slices/momentsSlice";
import { useTargetLanguage } from "../../../hooks/useTargetLanguage";

/**
 * One comment: body (translatable on tap), optional image, optional
 * correction card, and the engagement row the app has — like, emoji react,
 * reply, delete-my-own.
 *
 * Engagement counts are mirrored in local state so a tap responds at once;
 * every mutation also invalidates the `Comments` tag, so the next fetched
 * comment prop overwrites the mirror with the server's truth (the effect
 * below).
 *
 * `allowReplies` is false inside a `RepliesThread`: the backend stores a flat
 * parent/child pair, so the UI stops at one level rather than inventing a
 * deeper tree it can't represent.
 */

const PLACEHOLDER_CORRECTION_TEXT = "✏️ Correction";

const idOf = (u: any): string => (typeof u === "string" ? u : (u && u._id) || "");

const RelativeTime: React.FC<{ date: string }> = ({ date }) => {
  const { t } = useTranslation();

  const label = useMemo(() => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t("moments_section.timeAgo.justNow") || "just now";
    if (minutes < 60)
      return t("moments_section.timeAgo.minutesAgo", { minutes }) || `${minutes}m`;
    if (hours < 24) return t("moments_section.timeAgo.hoursAgo", { hours }) || `${hours}h`;
    if (days < 7) return t("moments_section.timeAgo.daysAgo", { days }) || `${days}d`;
    return new Date(date).toLocaleDateString();
  }, [date, t]);

  return <span className="shrink-0 text-xs text-gray-500">{label}</span>;
};

interface CommentItemProps {
  comment: CommentType;
  momentId: string;
  myUserId?: string;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  /** Lets a thread drop this reply from its own list once it's gone. */
  onDeleted?: (commentId: string) => void;
  allowReplies?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  momentId,
  myUserId,
  isLoggedIn,
  onRequireLogin,
  onDeleted,
  allowReplies = true,
}) => {
  const { t } = useTranslation();
  const targetLanguage = useTargetLanguage();

  const [likeComment] = useLikeCommentMutation();
  const [reactToComment] = useReactToCommentMutation();
  const [unreactToComment] = useUnreactToCommentMutation();
  const [translateComment] = useTranslateCommentMutation();
  const [deleteMomentComment] = useDeleteMomentCommentMutation();

  const likedByServer = (comment.likedUsers || []).some(
    (u) => idOf(u) === (myUserId || "")
  );

  const [liked, setLiked] = useState(likedByServer);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [reactions, setReactions] = useState<any[]>(comment.reactions || []);
  const [showPicker, setShowPicker] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  // Bumped after posting a reply: remounting the thread drops its paged
  // state so the new reply is read back from page 1 rather than appended
  // behind whatever was already loaded.
  const [repliesVersion, setRepliesVersion] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-sync whenever a fetch hands us a newer copy of this comment.
  useEffect(() => {
    setLiked((comment.likedUsers || []).some((u) => idOf(u) === (myUserId || "")));
    setLikeCount(comment.likeCount || 0);
    setReactions(comment.reactions || []);
  }, [comment, myUserId]);

  const handleLike = useCallback(() => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!previousLiked);
    setLikeCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));

    likeComment(comment._id)
      .unwrap()
      .then(
        (res: any) => {
          const data = res && res.data;
          if (!data) return;
          setLiked(!!data.isLiked);
          setLikeCount(data.likeCount || 0);
        },
        () => {
          setLiked(previousLiked);
          setLikeCount(previousCount);
        }
      );
  }, [isLoggedIn, onRequireLogin, liked, likeCount, likeComment, comment._id]);

  const handleToggleReaction = useCallback(
    (emoji: string) => {
      if (!isLoggedIn) {
        onRequireLogin();
        return;
      }
      setShowPicker(false);
      const mine = aggregateReactions(reactions as any, myUserId || "").some(
        (r) => r.emoji === emoji && r.reactedByMe
      );
      const run = mine
        ? unreactToComment({ commentId: comment._id, emoji })
        : reactToComment({ commentId: comment._id, emoji });

      run.unwrap().then(
        (res: any) => {
          const data = res && res.data;
          if (data && Array.isArray(data.reactions)) setReactions(data.reactions);
        },
        () => undefined
      );
    },
    [
      isLoggedIn,
      onRequireLogin,
      reactions,
      myUserId,
      unreactToComment,
      reactToComment,
      comment._id,
    ]
  );

  const handleDelete = useCallback(() => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setIsDeleting(true);
    deleteMomentComment({ momentId, commentId: comment._id })
      .unwrap()
      .then(
        () => {
          if (onDeleted) onDeleted(comment._id);
        },
        () => setIsDeleting(false)
      );
  }, [
    isLoggedIn,
    onRequireLogin,
    deleteMomentComment,
    momentId,
    comment._id,
    onDeleted,
  ]);

  const handleTranslate = useCallback(async () => {
    const res: any = await translateComment({
      commentId: comment._id,
      targetLanguage,
    }).unwrap();
    return { translatedText: (res && res.data && res.data.translatedText) || "" };
  }, [translateComment, comment._id, targetLanguage]);

  const correction = comment.correction;
  const isMine = !!myUserId && idOf(comment.user) === myUserId;
  const replyCount = comment.replyCount || 0;
  // A correction with no note of its own carries the server's placeholder
  // text; the card below already says everything it would.
  const showBody =
    !!comment.text && !(correction && comment.text === PLACEHOLDER_CORRECTION_TEXT);

  const actionClass =
    "flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-gray-800";

  return (
    <div
      data-testid="comment-item"
      className={`flex gap-3 py-3 ${isDeleting ? "opacity-50" : ""}`}
    >
      <Avatar
        src={(comment.user.imageUrls || [])[0]}
        name={comment.user.name}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <SurfaceCard padding="sm" className="bg-gray-50 shadow-none dark:bg-gray-800">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {comment.user.name}
            </h4>
            <RelativeTime date={comment.createdAt} />
          </div>

          {correction && (
            <div
              data-testid="comment-correction"
              className="mb-2 rounded-xl border border-brand/20 bg-brand/[0.04] p-2.5"
            >
              <div className="mb-1.5">
                <Badge>{t("moments_section.commentEngagement.correction") || "Correction"}</Badge>
              </div>
              {correction.originalText && (
                <p
                  data-testid="comment-correction-original"
                  className="text-sm text-gray-500 line-through"
                >
                  {correction.originalText}
                </p>
              )}
              <p
                data-testid="comment-correction-corrected"
                className="text-sm font-semibold text-brand"
              >
                {correction.correctedText}
              </p>
              {correction.explanation && (
                <p
                  data-testid="comment-correction-explanation"
                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  {correction.explanation}
                </p>
              )}
            </div>
          )}

          {showBody && (
            <TranslatableText
              text={comment.text}
              onTranslate={handleTranslate}
              isLoggedIn={isLoggedIn}
              onRequireLogin={onRequireLogin}
              className="text-sm leading-relaxed text-gray-700 dark:text-gray-200"
            />
          )}

          {comment.imageUrl && (
            <img
              data-testid="comment-image"
              src={comment.imageUrl}
              alt={comment.user.name}
              loading="lazy"
              className="mt-2 max-h-60 w-auto max-w-full rounded-xl object-cover"
            />
          )}
        </SurfaceCard>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-testid="comment-like"
            aria-pressed={liked}
            onClick={handleLike}
            className={`${actionClass} ${liked ? "text-blue-600" : ""}`}
          >
            {liked ? (
              <AiFillLike className="h-3.5 w-3.5" />
            ) : (
              <AiOutlineLike className="h-3.5 w-3.5" />
            )}
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            data-testid="comment-react-toggle"
            aria-expanded={showPicker}
            onClick={() => {
              if (!isLoggedIn) {
                onRequireLogin();
                return;
              }
              setShowPicker(!showPicker);
            }}
            className={actionClass}
          >
            <FaRegSmile className="h-3.5 w-3.5" />
            <span>{t("moments_section.commentEngagement.react") || "React"}</span>
          </button>

          {allowReplies && (
            <button
              type="button"
              data-testid="comment-reply"
              onClick={() => {
                if (!isLoggedIn) {
                  onRequireLogin();
                  return;
                }
                setShowReplyBox(!showReplyBox);
              }}
              className={actionClass}
            >
              <FaReply className="h-3 w-3" />
              <span>{t("moments_section.commentEngagement.reply") || "Reply"}</span>
            </button>
          )}

          {isMine && (
            <button
              type="button"
              data-testid="comment-delete"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`${actionClass} hover:text-red-600`}
            >
              <FaRegTrashAlt className="h-3 w-3" />
              <span>{t("moments_section.commentEngagement.delete") || "Delete"}</span>
            </button>
          )}
        </div>

        <div className="mt-1">
          <MomentReactionRow
            reactions={reactions}
            myUserId={myUserId || ""}
            onToggle={handleToggleReaction}
            showQuickPick={showPicker}
          />
        </div>

        {allowReplies && showReplyBox && (
          <div className="mt-2">
            <CommentComposer
              momentId={momentId}
              mode="reply"
              parentComment={comment._id}
              isLoggedIn={isLoggedIn}
              onRequireLogin={onRequireLogin}
              onDone={() => {
                setShowReplyBox(false);
                setShowReplies(true);
                setRepliesVersion((v) => v + 1);
              }}
              onCancel={() => setShowReplyBox(false)}
            />
          </div>
        )}

        {allowReplies && replyCount > 0 && (
          <button
            type="button"
            data-testid="comment-replies-toggle"
            aria-expanded={showReplies}
            onClick={() => setShowReplies(!showReplies)}
            className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            {showReplies
              ? t("moments_section.commentEngagement.hideReplies") || "Hide replies"
              : t("moments_section.commentEngagement.viewReplies", { count: replyCount }) ||
                `View ${replyCount} replies`}
          </button>
        )}

        {allowReplies && showReplies && (
          <RepliesThread
            key={repliesVersion}
            commentId={comment._id}
            momentId={momentId}
            myUserId={myUserId}
            isLoggedIn={isLoggedIn}
            onRequireLogin={onRequireLogin}
          />
        )}
      </div>
    </div>
  );
};

export default CommentItem;
