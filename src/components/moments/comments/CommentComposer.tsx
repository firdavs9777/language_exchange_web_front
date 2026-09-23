import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPaperPlane, FaImage } from "react-icons/fa";
import {
  useAddMomentCommentMutation,
  useUploadCommentImageMutation,
} from "../../../store/slices/momentsSlice";

/**
 * Writes one comment, one reply or one correction.
 *
 * The backend takes all three through the same route
 * (POST /api/v1/moments/:momentId/comments, controllers/comments.js
 * `createComment`): a reply adds `parentComment`, a correction adds
 * `correction: { originalText, correctedText, explanation }` and may leave
 * `text` empty -- the server then labels it "✏️ Correction" itself.
 *
 * An image is a second request: `createComment`'s multipart branch needs the
 * file on the create call, which fetchBaseQuery can't do alongside a JSON
 * body, so the image goes up with PUT /api/v1/comments/:id/image once the
 * comment exists. That second request failing does NOT mean the comment
 * failed -- it is already posted -- so it reports separately and still clears
 * the box.
 *
 * Field limits mirror models/Comment.js (text 500; correction originalText
 * and correctedText 2000, explanation 500) so an over-long field is stopped
 * here instead of coming back as a 500-character validation error.
 *
 * Posting is behind `protect`, so a logged-out visitor gets the caller's
 * sign-in prompt instead of a failed request.
 */

const TEXT_MAX = 500;
const CORRECTION_TEXT_MAX = 2000;
const EXPLANATION_MAX = 500;

interface CommentComposerProps {
  momentId: string;
  /** `comment` (default), `reply` (needs `parentComment`) or `correction`. */
  mode?: "comment" | "reply" | "correction";
  parentComment?: string;
  /** The moment's own text, prefilled as the correction's "original". */
  momentText?: string;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onDone?: () => void;
  onCancel?: () => void;
  /** DOM id for the text box, so a "Comment" button can focus it. */
  inputId?: string;
}

const CommentComposer: React.FC<CommentComposerProps> = ({
  momentId,
  mode = "comment",
  parentComment,
  momentText,
  isLoggedIn,
  onRequireLogin,
  onDone,
  onCancel,
  inputId,
}) => {
  const { t } = useTranslation();
  const [addMomentComment, { isLoading: isPosting }] = useAddMomentCommentMutation();
  const [uploadCommentImage] = useUploadCommentImageMutation();

  const [text, setText] = useState("");
  const [original, setOriginal] = useState(momentText || "");
  const [corrected, setCorrected] = useState("");
  const [explanation, setExplanation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCorrection = mode === "correction";

  useEffect(() => {
    setOriginal(momentText || "");
  }, [momentText]);

  const pending = isPosting || isUploading;
  const canSubmit = isCorrection ? corrected.trim().length > 0 : text.trim().length > 0;

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setFile(files && files.length > 0 ? files[0] : null);
  }, []);

  const clearComposer = useCallback(() => {
    setText("");
    setCorrected("");
    setExplanation("");
    setFile(null);
    // The <input type="file"> keeps its selection (and won't re-fire change
    // for the same file) until its value is cleared explicitly.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isLoggedIn) {
        onRequireLogin();
        return;
      }
      if (!canSubmit || pending) return;

      const payload: any = { momentId, text: text.trim() };
      if (mode === "reply" && parentComment) {
        payload.parentComment = parentComment;
      }
      if (isCorrection) {
        payload.correction = {
          originalText: original.trim(),
          correctedText: corrected.trim(),
          explanation: explanation.trim(),
        };
      }

      setError(null);
      setNotice(null);

      let created: any;
      try {
        created = await addMomentComment(payload).unwrap();
      } catch (err: any) {
        setError(
          (err && err.data && (err.data.error || err.data.message)) ||
            (err && err.message) ||
            t("moments_section.commentEngagement.postFailed") ||
            "Couldn't post that. Try again."
        );
        return;
      }

      // The comment exists from here on: an image failure is a notice, not a
      // failed post, and the box still clears.
      const commentId = created && created.data && created.data._id;
      if (file && commentId) {
        setIsUploading(true);
        try {
          await uploadCommentImage({ commentId, file }).unwrap();
        } catch (err) {
          setNotice(
            t("moments_section.commentEngagement.imageFailed") ||
              "Comment posted, but the photo didn't attach."
          );
        } finally {
          setIsUploading(false);
        }
      }

      clearComposer();
      if (onDone) onDone();
    },
    [
      isLoggedIn,
      onRequireLogin,
      canSubmit,
      pending,
      momentId,
      text,
      mode,
      parentComment,
      isCorrection,
      original,
      corrected,
      explanation,
      addMomentComment,
      file,
      uploadCommentImage,
      clearComposer,
      onDone,
      t,
    ]
  );

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800";

  return (
    <form
      data-testid="comment-composer"
      onSubmit={handleSubmit}
      className="space-y-2"
    >
      {isCorrection && (
        <div className="space-y-2 rounded-2xl border border-brand/20 bg-brand/[0.04] p-3">
          <label className="block text-xs font-semibold text-gray-500">
            {t("moments_section.commentEngagement.originalLabel") || "Original"}
            <textarea
              data-testid="comment-composer-original"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              disabled={pending}
              rows={2}
              maxLength={CORRECTION_TEXT_MAX}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            {t("moments_section.commentEngagement.correctedLabel") || "Corrected"}
            <textarea
              data-testid="comment-composer-corrected"
              value={corrected}
              onChange={(e) => setCorrected(e.target.value)}
              disabled={pending}
              rows={2}
              maxLength={CORRECTION_TEXT_MAX}
              placeholder={
                t("moments_section.commentEngagement.correctedPlaceholder") ||
                "Write it the way a native speaker would"
              }
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            {t("moments_section.commentEngagement.explanationLabel") || "Explanation"}
            <textarea
              data-testid="comment-composer-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              disabled={pending}
              rows={2}
              maxLength={EXPLANATION_MAX}
              placeholder={
                t("moments_section.commentEngagement.explanationPlaceholder") ||
                "Why is it written this way? (optional)"
              }
              className={`mt-1 ${fieldClass}`}
            />
          </label>
        </div>
      )}

      <textarea
        id={inputId}
        data-testid="comment-composer-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
        rows={isCorrection ? 2 : 3}
        maxLength={TEXT_MAX}
        placeholder={
          isCorrection
            ? t("moments_section.commentEngagement.correctionNotePlaceholder") ||
              "Add a note (optional)"
            : mode === "reply"
            ? t("moments_section.commentEngagement.replyPlaceholder") ||
              "Write a reply…"
            : t("moments_section.writeCommentPlaceholder") ||
              "Write a comment…"
        }
        className={fieldClass}
      />

      {error && (
        <p
          data-testid="comment-composer-error"
          role="alert"
          className="text-xs text-red-500"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          data-testid="comment-composer-notice"
          role="status"
          className="text-xs text-amber-600"
        >
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
          <FaImage className="h-3.5 w-3.5" />
          <span>
            {file
              ? file.name
              : t("moments_section.commentEngagement.attachImage") || "Add a photo"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            data-testid="comment-composer-image"
            onChange={handleFile}
            disabled={pending}
            className="sr-only"
          />
        </label>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              data-testid="comment-composer-cancel"
              onClick={onCancel}
              className="rounded-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {t("moments_section.commentEngagement.cancel") || "Cancel"}
            </button>
          )}
          <button
            type="submit"
            data-testid="comment-composer-submit"
            disabled={!canSubmit || pending}
            className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            <FaPaperPlane className="h-3 w-3" />
            <span>
              {isCorrection
                ? t("moments_section.commentEngagement.postCorrection") ||
                  "Post correction"
                : t("moments_section.commentEngagement.post") || "Post"}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default CommentComposer;
