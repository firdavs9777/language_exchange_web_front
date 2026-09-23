import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CommentItem from "./CommentItem";
import { CommentType } from "./types";
import { useGetCommentRepliesQuery } from "../../../store/slices/momentsSlice";

/**
 * The replies under one comment, oldest first, paged the way the backend
 * pages them (GET /api/v1/comments/:id/replies -> { data, total, page, pages }).
 *
 * Pages accumulate instead of replacing: "Load more" appends the next page so
 * an expanded thread never loses what the reader was already looking at. The
 * merge is by `_id` and returns the previous array untouched when a render
 * brings nothing new, which keeps the effect from looping on a fresh query
 * result object.
 *
 * Replies render with `allowReplies={false}`: `models/Comment.js` stores a
 * single `parentComment` pointer, so one level is all the data supports.
 */

const REPLIES_PAGE_SIZE = 10;

interface RepliesThreadProps {
  commentId: string;
  momentId: string;
  myUserId?: string;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
}

const RepliesThread: React.FC<RepliesThreadProps> = ({
  commentId,
  momentId,
  myUserId,
  isLoggedIn,
  onRequireLogin,
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [replies, setReplies] = useState<CommentType[]>([]);

  const { data, isFetching } = useGetCommentRepliesQuery({
    commentId,
    page,
    limit: REPLIES_PAGE_SIZE,
  });

  const batch: CommentType[] = (data && data.data) || [];
  const pages: number = (data && data.pages) || 1;

  useEffect(() => {
    if (batch.length === 0) return;
    setReplies((prev) => {
      const additions = batch.filter(
        (reply) => !prev.some((existing) => existing._id === reply._id)
      );
      if (additions.length === 0) return prev;
      return prev.concat(additions);
    });
    // `batch` is a fresh array on every query result; the merge above is a
    // no-op once the ids are already in, so this settles after one pass.
  }, [batch]);

  const loadMore = useCallback(() => setPage((p) => p + 1), []);

  return (
    <div
      data-testid="replies-thread"
      className="mt-2 space-y-1 border-l-2 border-gray-100 pl-3 dark:border-gray-700"
    >
      {replies.map((reply) => (
        <CommentItem
          key={reply._id}
          comment={reply}
          momentId={momentId}
          myUserId={myUserId}
          isLoggedIn={isLoggedIn}
          onRequireLogin={onRequireLogin}
          allowReplies={false}
        />
      ))}

      {isFetching && replies.length === 0 && (
        <p className="py-2 text-xs text-gray-500">
          {t("moments_section.comments.loadingReplies") || "Loading replies…"}
        </p>
      )}

      {page < pages && (
        <button
          type="button"
          data-testid="replies-load-more"
          onClick={loadMore}
          disabled={isFetching}
          className="py-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
        >
          {t("moments_section.comments.loadMoreReplies") || "Load more"}
        </button>
      )}
    </div>
  );
};

export default RepliesThread;
