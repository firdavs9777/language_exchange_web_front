import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FaRegComments } from "react-icons/fa";
import AdUnit from "../../ads/AdUnit";
import { AD_SLOTS } from "../../ads/adsenseConfig";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";
import { CommentType } from "./types";
import { useGetMomentCommentsQuery } from "../../../store/slices/momentsSlice";

/**
 * The whole comment surface of a moment: the composer (comment or
 * correction), the list, and the empty state.
 *
 * Reading comments is public; writing anything is not, so a logged-out
 * visitor gets the sign-in prompt in place of the composer and the per-action
 * prompt (`onRequireLogin`) everywhere else.
 */

interface CommentListProps {
  momentId: string;
  /** The moment's text, prefilled as the "original" of a correction. */
  momentText?: string;
  myUserId?: string;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
}

const CommentList: React.FC<CommentListProps> = ({
  momentId,
  momentText,
  myUserId,
  isLoggedIn,
  onRequireLogin,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"comment" | "correction">("comment");

  const { data, isLoading } = useGetMomentCommentsQuery(
    { momentId },
    { skip: !momentId }
  );

  const comments: CommentType[] = (data && data.data) || [];

  const tabClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? "bg-blue-500 text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
    }`;

  return (
    <div data-testid="comment-list">
      {isLoggedIn ? (
        <div className="mb-4 sm:mb-6">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              data-testid="comments-mode-comment"
              aria-pressed={mode === "comment"}
              onClick={() => setMode("comment")}
              className={tabClass(mode === "comment")}
            >
              {t("moments_section.comments.commentTab") || "Comment"}
            </button>
            <button
              type="button"
              data-testid="comments-mode-correction"
              aria-pressed={mode === "correction"}
              onClick={() => setMode("correction")}
              className={tabClass(mode === "correction")}
            >
              {t("moments_section.comments.correctionTab") || "Correction"}
            </button>
          </div>

          <CommentComposer
            key={mode}
            momentId={momentId}
            mode={mode}
            momentText={momentText}
            isLoggedIn={isLoggedIn}
            onRequireLogin={onRequireLogin}
            inputId={mode === "comment" ? "commentInput" : undefined}
          />
        </div>
      ) : (
        <div
          data-testid="comments-signin"
          className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center sm:mb-6 sm:p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="text-sm text-gray-600 sm:text-base dark:text-gray-300">
            {t("moments_section.signInToComment") ||
              "Sign in to join the conversation."}{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              {t("moments_section.signIn") || "Sign in"}
            </Link>
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {t("moments_section.loadingComments") || "Loading comments…"}
        </p>
      ) : comments.length > 0 ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 sm:mb-4 sm:text-base dark:text-gray-200">
            <span>{t("moments_section.comments") || "Comments"}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600 sm:h-6 sm:w-6">
              {comments.length}
            </span>
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {comments.map((comment, index) => (
              <React.Fragment key={comment._id}>
                <CommentItem
                  comment={comment}
                  momentId={momentId}
                  myUserId={myUserId}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={onRequireLogin}
                />
                {/* One ad after the fifth comment, as before. No-op until
                    AdSense is configured. */}
                {index === 4 && comments.length > 5 && (
                  <AdUnit slot={AD_SLOTS.comments} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center sm:py-12">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 sm:mb-4 sm:h-16 sm:w-16">
            <FaRegComments className="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" />
          </div>
          <p
            data-testid="comments-empty"
            className="text-sm font-medium text-gray-500 sm:text-base"
          >
            {t("moments_section.noCommentsYet") || "No comments yet"}
          </p>
          <p className="mt-1 text-xs text-gray-400 sm:text-sm">
            {t("moments_section.comments.beFirst") ||
              "Be the first to share your thoughts!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentList;
